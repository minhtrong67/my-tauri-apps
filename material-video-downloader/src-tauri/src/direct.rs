//! Segmented HTTP downloader (IDM style): the file is split into several byte
//! ranges that are downloaded in parallel, can be paused and resumed.

use std::io::SeekFrom;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::StreamExt;
use reqwest::header::{ACCEPT, CONTENT_RANGE, COOKIE, RANGE, REFERER, USER_AGENT};
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use tokio::task::JoinSet;

use crate::manager::{Control, Manager, Shared};
use crate::models::*;
use crate::util::*;

/// Attach the browser-like headers stored with a download.
pub fn with_headers(req: reqwest::RequestBuilder, d: &Download) -> reqwest::RequestBuilder {
    let mut r = req
        .header(USER_AGENT, d.user_agent.as_deref().unwrap_or(DEFAULT_UA))
        .header(ACCEPT, "*/*");
    if let Some(referer) = &d.referer {
        r = r.header(REFERER, referer);
    }
    if let Some(cookie) = &d.cookie {
        r = r.header(COOKIE, cookie);
    }
    r
}

struct Probe {
    total: Option<u64>,
    ranged: bool,
}

async fn probe(m: &Manager, d: &Download) -> Result<Probe, Stop> {
    let resp = with_headers(m.http.get(&d.url), d).header(RANGE, "bytes=0-0").send().await?;
    let status = resp.status();
    if status.as_u16() == 206 {
        let total = resp
            .headers()
            .get(CONTENT_RANGE)
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.rsplit('/').next())
            .and_then(|t| t.parse::<u64>().ok());
        return Ok(Probe { total, ranged: total.is_some() });
    }
    if !status.is_success() {
        return Err(Stop::Failed(format!("Server returned HTTP {}", status.as_u16())));
    }
    Ok(Probe { total: resp.content_length(), ranged: false })
}

struct StopOnDrop(Arc<Shared>);

impl Drop for StopOnDrop {
    fn drop(&mut self) {
        self.0.stop.store(true, Ordering::Relaxed);
    }
}

pub async fn run(m: &Arc<Manager>, id: &str, ctl: &Arc<Control>) -> Result<(), Stop> {
    let mut d = m.get(id).ok_or(Stop::Canceled)?;
    let settings = m.settings();
    let dir = PathBuf::from(&d.dir);
    tokio::fs::create_dir_all(&dir).await?;
    let part = dir.join(format!("{}.part", d.filename));

    // Fresh start (or the partial file vanished): probe the server and plan segments.
    if d.segments.is_empty() || !part.exists() {
        let p = probe(m, &d).await?;
        ctl.check()?;
        let total = p.total.unwrap_or(0);
        let segs: Vec<Seg> = if p.ranged && total >= 2 * 1024 * 1024 && settings.connections > 1 {
            let n = (settings.connections as u64).min(total / (1024 * 1024)).max(1);
            let chunk = total.div_ceil(n);
            (0..n)
                .map(|i| Seg {
                    start: i * chunk,
                    end: ((i + 1) * chunk).min(total) - 1,
                    done: 0,
                })
                .collect()
        } else {
            vec![Seg {
                start: 0,
                end: if total > 0 { total - 1 } else { u64::MAX },
                done: 0,
            }]
        };
        let f = tokio::fs::File::create(&part).await?;
        if total > 0 {
            f.set_len(total).await?;
        }
        drop(f);
        m.update(id, |x| {
            x.segments = segs;
            x.total = total;
            x.downloaded = 0;
            x.progress = 0.0;
        });
        d = m.get(id).ok_or(Stop::Canceled)?;
    }

    let segs = Arc::new(Mutex::new(d.segments.clone()));
    let done_sum: u64 = d.segments.iter().map(|s| s.done).sum();
    let shared = Shared::new(done_sum, d.total);
    let _guard = StopOnDrop(shared.clone());
    m.spawn_reporter(id, shared.clone());

    let result = run_workers(m, &d, &part, &segs, &shared, ctl).await;

    // Always keep resume data in sync, whatever happened.
    let snapshot = segs.lock().unwrap_or_else(|e| e.into_inner()).clone();
    m.set_segments(id, snapshot.clone());
    result?;

    let complete = snapshot.iter().all(|g| g.end != u64::MAX && g.done == g.end - g.start + 1);
    if !complete {
        return Err(Stop::Failed("The download is incomplete. Try resuming it.".into()));
    }

    let mut final_path = dir.join(&d.filename);
    let mut final_name = d.filename.clone();
    if final_path.exists() {
        final_name = format!("{} ({}).{}", stem_of(&d.filename), now_ms() % 100000, ext_of(&d.filename));
        final_path = dir.join(&final_name);
    }
    tokio::fs::rename(&part, &final_path).await?;
    let size = tokio::fs::metadata(&final_path).await.map(|m| m.len()).unwrap_or(0);
    let path_str = final_path.to_string_lossy().to_string();
    m.update(id, |x| {
        x.filename = final_name;
        x.path = Some(path_str);
        x.total = size;
        x.downloaded = size;
    });
    Ok(())
}

async fn run_workers(
    m: &Arc<Manager>,
    d: &Download,
    part: &PathBuf,
    segs: &Arc<Mutex<Vec<Seg>>>,
    shared: &Arc<Shared>,
    ctl: &Arc<Control>,
) -> Result<(), Stop> {
    let count = segs.lock().unwrap_or_else(|e| e.into_inner()).len();
    let mut set: JoinSet<Result<(), Stop>> = JoinSet::new();
    for idx in 0..count {
        set.spawn(worker(m.clone(), d.clone(), part.clone(), idx, segs.clone(), shared.clone(), ctl.clone()));
    }
    let mut first_err: Option<Stop> = None;
    while let Some(joined) = set.join_next().await {
        match joined {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                if first_err.is_none() {
                    first_err = Some(e);
                    // Wake the siblings so they stop quickly.
                    set.abort_all();
                }
            }
            Err(e) if e.is_cancelled() => {}
            Err(e) => {
                if first_err.is_none() {
                    first_err = Some(Stop::Failed(e.to_string()));
                }
            }
        }
    }
    match first_err {
        Some(e) => Err(e),
        None => Ok(()),
    }
}

async fn worker(
    m: Arc<Manager>,
    d: Download,
    part: PathBuf,
    idx: usize,
    segs: Arc<Mutex<Vec<Seg>>>,
    shared: Arc<Shared>,
    ctl: Arc<Control>,
) -> Result<(), Stop> {
    let mut attempts = 0u32;
    loop {
        match worker_once(&m, &d, &part, idx, &segs, &shared, &ctl).await {
            Ok(()) => return Ok(()),
            Err(Stop::Failed(e)) => {
                attempts += 1;
                if attempts > 5 {
                    return Err(Stop::Failed(e));
                }
                for _ in 0..(attempts * 2) {
                    ctl.check()?;
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            }
            Err(other) => return Err(other),
        }
    }
}

async fn worker_once(
    m: &Arc<Manager>,
    d: &Download,
    part: &PathBuf,
    idx: usize,
    segs: &Arc<Mutex<Vec<Seg>>>,
    shared: &Arc<Shared>,
    ctl: &Arc<Control>,
) -> Result<(), Stop> {
    let (start, end, done, multi) = {
        let s = segs.lock().unwrap_or_else(|e| e.into_inner());
        (s[idx].start, s[idx].end, s[idx].done, s.len() > 1)
    };
    let len_known = end != u64::MAX;
    if len_known && start + done > end {
        return Ok(());
    }
    let pos = start + done;
    let ranged = len_known || pos > 0;

    let mut req = with_headers(m.http.get(&d.url), d);
    if ranged {
        let range = if len_known { format!("bytes={pos}-{end}") } else { format!("bytes={pos}-") };
        req = req.header(RANGE, range);
    }
    let resp = req.send().await?;
    let status = resp.status();
    if !status.is_success() {
        return Err(Stop::Failed(format!("Server returned HTTP {}", status.as_u16())));
    }

    let mut write_pos = pos;
    if ranged && status.as_u16() == 200 && pos > 0 {
        // The server ignored our Range header: only a single segment can restart from scratch.
        if multi {
            return Err(Stop::Failed("The server does not support resuming this download.".into()));
        }
        let mut s = segs.lock().unwrap_or_else(|e| e.into_inner());
        shared.downloaded.fetch_sub(s[idx].done.min(shared.downloaded.load(Ordering::Relaxed)), Ordering::Relaxed);
        s[idx].done = 0;
        write_pos = 0;
    }

    let mut file = tokio::fs::OpenOptions::new().write(true).open(part).await?;
    file.seek(SeekFrom::Start(write_pos)).await?;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        ctl.check()?;
        let chunk = chunk?;
        let mut data: &[u8] = &chunk;
        if len_known {
            let remaining = end + 1 - write_pos;
            if data.len() as u64 > remaining {
                data = &data[..remaining as usize];
            }
        }
        if data.is_empty() {
            break;
        }
        m.limiter.acquire(data.len()).await;
        file.write_all(data).await?;
        write_pos += data.len() as u64;
        shared.downloaded.fetch_add(data.len() as u64, Ordering::Relaxed);
        {
            let mut s = segs.lock().unwrap_or_else(|e| e.into_inner());
            s[idx].done += data.len() as u64;
        }
        if len_known && write_pos > end {
            break;
        }
    }
    file.flush().await?;

    if len_known {
        if write_pos <= end {
            return Err(Stop::Failed("The connection closed before the segment finished.".into()));
        }
    } else {
        // Unknown length: the stream end is the file end.
        let mut s = segs.lock().unwrap_or_else(|e| e.into_inner());
        s[idx].end = start + s[idx].done - 1;
        shared.total.store(s[idx].done, Ordering::Relaxed);
    }
    Ok(())
}
