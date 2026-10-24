//! HLS (.m3u8) downloader: parallel segment download, AES-128 decryption and
//! final muxing (with ffmpeg when available).

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;

use futures_util::stream::{self, StreamExt};
use url::Url;

use crate::direct::with_headers;
use crate::manager::{Control, Manager, Shared};
use crate::models::*;
use crate::util::*;

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct Variant {
    pub url: String,
    pub bandwidth: u64,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Debug)]
pub struct Key {
    pub uri: String,
    pub iv: Option<[u8; 16]>,
}

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct HlsSeg {
    pub url: String,
    pub dur: f64,
    pub seq: u64,
    pub key: Option<Key>,
    pub map: Option<String>,
}

pub enum Playlist {
    Master(Vec<Variant>),
    Media { segments: Vec<HlsSeg>, duration: f64 },
}

fn parse_attrs(s: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut key = String::new();
    let mut val = String::new();
    let mut in_key = true;
    let mut quoted = false;
    for c in s.chars() {
        if in_key {
            if c == '=' {
                in_key = false;
            } else {
                key.push(c);
            }
        } else if c == '"' {
            quoted = !quoted;
        } else if c == ',' && !quoted {
            map.insert(key.trim().to_uppercase(), val.clone());
            key.clear();
            val.clear();
            in_key = true;
        } else {
            val.push(c);
        }
    }
    if !key.is_empty() {
        map.insert(key.trim().to_uppercase(), val);
    }
    map
}

fn parse_iv(s: &str) -> Option<[u8; 16]> {
    let hex = s.trim_start_matches("0x").trim_start_matches("0X");
    let hex = format!("{:0>32}", hex);
    if hex.len() != 32 {
        return None;
    }
    let mut out = [0u8; 16];
    for i in 0..16 {
        out[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
    }
    Some(out)
}

fn resolve(base: &Url, s: &str) -> String {
    base.join(s).map(|u| u.to_string()).unwrap_or_else(|_| s.to_string())
}

pub fn parse(text: &str, base: &Url) -> Result<Playlist, String> {
    if !text.trim_start().starts_with("#EXTM3U") {
        return Err("This link is not a valid HLS playlist.".into());
    }
    if text.contains("#EXT-X-STREAM-INF") {
        let mut variants = Vec::new();
        let mut pending: Option<HashMap<String, String>> = None;
        for line in text.lines().map(str::trim) {
            if let Some(rest) = line.strip_prefix("#EXT-X-STREAM-INF:") {
                pending = Some(parse_attrs(rest));
            } else if !line.is_empty() && !line.starts_with('#') {
                if let Some(attrs) = pending.take() {
                    let (w, h) = attrs
                        .get("RESOLUTION")
                        .and_then(|r| r.split_once('x'))
                        .map(|(w, h)| (w.parse().unwrap_or(0), h.parse().unwrap_or(0)))
                        .unwrap_or((0, 0));
                    let bw = attrs
                        .get("BANDWIDTH")
                        .or_else(|| attrs.get("AVERAGE-BANDWIDTH"))
                        .and_then(|b| b.parse().ok())
                        .unwrap_or(0);
                    variants.push(Variant { url: resolve(base, line), bandwidth: bw, width: w, height: h });
                }
            }
        }
        if variants.is_empty() {
            return Err("The playlist has no playable streams.".into());
        }
        return Ok(Playlist::Master(variants));
    }

    let mut segments = Vec::new();
    let mut media_seq: u64 = 0;
    let mut key: Option<Key> = None;
    let mut map: Option<String> = None;
    let mut pending_dur = 0.0f64;
    let mut duration = 0.0f64;
    for line in text.lines().map(str::trim) {
        if let Some(v) = line.strip_prefix("#EXT-X-MEDIA-SEQUENCE:") {
            media_seq = v.trim().parse().unwrap_or(0);
        } else if let Some(v) = line.strip_prefix("#EXTINF:") {
            pending_dur = v.split(',').next().and_then(|d| d.trim().parse().ok()).unwrap_or(0.0);
        } else if let Some(v) = line.strip_prefix("#EXT-X-KEY:") {
            let a = parse_attrs(v);
            match a.get("METHOD").map(|s| s.as_str()) {
                Some("NONE") | None => key = None,
                Some("AES-128") => {
                    let uri = a.get("URI").ok_or("Encrypted playlist without a key URI.")?;
                    key = Some(Key {
                        uri: resolve(base, uri),
                        iv: a.get("IV").and_then(|iv| parse_iv(iv)),
                    });
                }
                Some(other) => return Err(format!("Unsupported HLS encryption ({other}).")),
            }
        } else if let Some(v) = line.strip_prefix("#EXT-X-MAP:") {
            let a = parse_attrs(v);
            map = a.get("URI").map(|u| resolve(base, u));
        } else if !line.is_empty() && !line.starts_with('#') {
            let seq = media_seq + segments.len() as u64;
            segments.push(HlsSeg { url: resolve(base, line), dur: pending_dur, seq, key: key.clone(), map: map.clone() });
            duration += pending_dur;
            pending_dur = 0.0;
        }
    }
    Ok(Playlist::Media { segments, duration })
}

pub async fn fetch_text(m: &Manager, d: &Download, url: &str) -> Result<(String, Url), Stop> {
    let resp = with_headers(m.http.get(url), d).send().await?;
    if !resp.status().is_success() {
        return Err(Stop::Failed(format!("Server returned HTTP {}", resp.status().as_u16())));
    }
    let final_url = resp.url().clone();
    let text = resp.text().await?;
    Ok((text, final_url))
}

fn decrypt(data: Vec<u8>, key: &[u8], iv: [u8; 16]) -> Result<Vec<u8>, Stop> {
    use cbc::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};
    type Dec = cbc::Decryptor<aes::Aes128>;
    let mut buf = data;
    let dec = Dec::new_from_slices(key, &iv).map_err(|_| Stop::Failed("Invalid HLS key.".into()))?;
    let len = dec
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|_| Stop::Failed("Could not decrypt a video segment.".into()))?
        .len();
    buf.truncate(len);
    Ok(buf)
}

async fn fetch_bytes(m: &Manager, d: &Download, url: &str, ctl: &Control) -> Result<Vec<u8>, Stop> {
    let mut last = Stop::Failed("download failed".into());
    for attempt in 0..4u32 {
        ctl.check()?;
        match with_headers(m.http.get(url), d).send().await {
            Ok(resp) if resp.status().is_success() => match resp.bytes().await {
                Ok(b) => return Ok(b.to_vec()),
                Err(e) => last = Stop::Failed(e.to_string()),
            },
            Ok(resp) => last = Stop::Failed(format!("Server returned HTTP {}", resp.status().as_u16())),
            Err(e) => last = Stop::Failed(e.to_string()),
        }
        tokio::time::sleep(Duration::from_millis(400 * (attempt as u64 + 1))).await;
    }
    Err(last)
}

pub async fn run(m: &Arc<Manager>, id: &str, ctl: &Arc<Control>) -> Result<(), Stop> {
    let d = m.get(id).ok_or(Stop::Canceled)?;
    let dir = PathBuf::from(&d.dir);
    let start_url = if d.selector.is_empty() { d.url.clone() } else { d.selector.clone() };

    let (text, base) = fetch_text(m, &d, &start_url).await?;
    let mut playlist = parse(&text, &base)?;
    if let Playlist::Master(variants) = &playlist {
        let best = variants.iter().max_by_key(|v| v.bandwidth).cloned().ok_or("No streams found")?;
        let (t, b) = fetch_text(m, &d, &best.url).await?;
        playlist = parse(&t, &b)?;
    }
    let (segments, duration) = match playlist {
        Playlist::Media { segments, duration } => (segments, duration),
        Playlist::Master(_) => return Err(Stop::Failed("Nested master playlists are not supported.".into())),
    };
    if segments.is_empty() {
        return Err(Stop::Failed("The playlist does not contain any video segments.".into()));
    }
    m.update(id, |x| {
        if x.duration.is_none() && duration > 0.0 {
            x.duration = Some(duration);
        }
    });

    let tmp = dir.join(format!(".{}.hls", d.id));
    tokio::fs::create_dir_all(&tmp).await?;
    let n = segments.len();

    // Encryption keys (fetched once per URI).
    let mut keys: HashMap<String, Vec<u8>> = HashMap::new();
    for key in segments.iter().filter_map(|s| s.key.as_ref()) {
        if !keys.contains_key(&key.uri) {
            let bytes = fetch_bytes(m, &d, &key.uri, ctl).await?;
            keys.insert(key.uri.clone(), bytes);
        }
    }
    let keys = Arc::new(keys);

    // Init segments for fragmented MP4.
    let mut inits: Vec<String> = Vec::new();
    for s in &segments {
        if let Some(map) = &s.map {
            if !inits.contains(map) {
                inits.push(map.clone());
            }
        }
    }
    for (i, url) in inits.iter().enumerate() {
        let path = tmp.join(format!("init{i}.bin"));
        if !path.exists() {
            let bytes = fetch_bytes(m, &d, url, ctl).await?;
            tokio::fs::write(&path, bytes).await?;
        }
    }

    // Resume: count the segments that are already on disk.
    let mut have_bytes = 0u64;
    let mut have_segs = 0u64;
    for i in 0..n {
        if let Ok(meta) = tokio::fs::metadata(tmp.join(format!("{i:06}.seg"))).await {
            have_bytes += meta.len();
            have_segs += 1;
        }
    }
    let shared = Shared::new(have_bytes, if have_segs > 0 { have_bytes * n as u64 / have_segs } else { 0 });
    let seg_done = Arc::new(std::sync::atomic::AtomicU64::new(have_segs));
    m.spawn_reporter(id, shared.clone());

    let conc = (m.settings().connections as usize).clamp(2, 16);
    let results: Vec<Result<(), Stop>> = {
        let jobs = segments.iter().cloned().enumerate().map(|(i, seg)| {
            let m = m.clone();
            let d = d.clone();
            let tmp = tmp.clone();
            let keys = keys.clone();
            let shared = shared.clone();
            let seg_done = seg_done.clone();
            let ctl = ctl.clone();
            async move {
                let final_path = tmp.join(format!("{i:06}.seg"));
                if final_path.exists() {
                    return Ok(());
                }
                ctl.check()?;
                let mut data = fetch_bytes(&m, &d, &seg.url, &ctl).await?;
                if let Some(key) = &seg.key {
                    let k = keys.get(&key.uri).ok_or("Missing HLS key")?;
                    let iv = key.iv.unwrap_or_else(|| (seg.seq as u128).to_be_bytes());
                    data = decrypt(data, k, iv)?;
                }
                m.limiter.acquire(data.len()).await;
                let tmp_file = tmp.join(format!("{i:06}.seg.tmp"));
                tokio::fs::write(&tmp_file, &data).await?;
                tokio::fs::rename(&tmp_file, &final_path).await?;
                let bytes = shared.downloaded.fetch_add(data.len() as u64, Ordering::Relaxed) + data.len() as u64;
                let done = seg_done.fetch_add(1, Ordering::Relaxed) + 1;
                shared.total.store(bytes * n as u64 / done, Ordering::Relaxed);
                Ok::<(), Stop>(())
            }
        });
        // Stop pulling new segments as soon as one fails or the user pauses.
        let mut out = Vec::new();
        let mut s = stream::iter(jobs).buffer_unordered(conc);
        while let Some(r) = s.next().await {
            let failed = r.is_err();
            out.push(r);
            if failed {
                break;
            }
        }
        out
    };
    shared.stop.store(true, Ordering::Relaxed);
    for r in results {
        r?;
    }
    ctl.check()?;

    // ---- merge ----
    m.update(id, |x| {
        x.status = Status::Merging;
        x.progress = 99.5;
        x.speed = 0.0;
        x.eta = None;
    });
    let merged = tmp.join("merged.bin");
    {
        let tmp = tmp.clone();
        let merged = merged.clone();
        let segments = segments.clone();
        let inits = inits.clone();
        tokio::task::spawn_blocking(move || -> Result<(), String> {
            use std::io::{BufWriter, Write};
            let out = std::fs::File::create(&merged).map_err(|e| e.to_string())?;
            let mut out = BufWriter::new(out);
            let mut last_init: Option<usize> = None;
            for (i, s) in segments.iter().enumerate() {
                if let Some(map) = &s.map {
                    let idx = inits.iter().position(|u| u == map);
                    if idx != last_init {
                        if let Some(ix) = idx {
                            let mut f = std::fs::File::open(tmp.join(format!("init{ix}.bin"))).map_err(|e| e.to_string())?;
                            std::io::copy(&mut f, &mut out).map_err(|e| e.to_string())?;
                        }
                        last_init = idx;
                    }
                }
                let mut f = std::fs::File::open(tmp.join(format!("{i:06}.seg"))).map_err(|e| e.to_string())?;
                std::io::copy(&mut f, &mut out).map_err(|e| e.to_string())?;
            }
            out.flush().map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| Stop::Failed(e.to_string()))?
        .map_err(Stop::Failed)?;
    }

    let has_map = !inits.is_empty();
    let ffmpeg = crate::ytdlp::ffmpeg_path(m);
    let ext = if has_map || ffmpeg.is_some() { "mp4" } else { "ts" };
    let final_name = unique_name(&dir, &with_ext(&d.filename, ext), &[]);
    let final_path = dir.join(&final_name);

    let mut done = false;
    if let (Some(ff), false) = (&ffmpeg, has_map) {
        for bsf in [true, false] {
            let mut cmd = tokio::process::Command::new(ff);
            cmd.args(["-y", "-loglevel", "error", "-i"]).arg(&merged).args(["-c", "copy"]);
            if bsf {
                cmd.args(["-bsf:a", "aac_adtstoasc"]);
            }
            cmd.arg(&final_path);
            cmd.stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null());
            #[cfg(windows)]
            cmd.creation_flags(CREATE_NO_WINDOW);
            if matches!(cmd.status().await, Ok(s) if s.success()) {
                done = true;
                break;
            }
            let _ = tokio::fs::remove_file(&final_path).await;
        }
    }
    if !done {
        // No ffmpeg (or it failed): keep the raw stream.
        let raw_ext = if has_map { "mp4" } else { "ts" };
        let name = unique_name(&dir, &with_ext(&d.filename, raw_ext), &[]);
        let target = dir.join(&name);
        tokio::fs::rename(&merged, &target).await?;
        finish(m, id, &name, &target).await;
    } else {
        finish(m, id, &final_name, &final_path).await;
    }
    let _ = tokio::fs::remove_dir_all(&tmp).await;
    Ok(())
}

async fn finish(m: &Arc<Manager>, id: &str, name: &str, path: &std::path::Path) {
    let size = tokio::fs::metadata(path).await.map(|x| x.len()).unwrap_or(0);
    let name = name.to_string();
    let path = path.to_string_lossy().to_string();
    m.update(id, |x| {
        x.filename = name;
        x.path = Some(path);
        x.total = size;
        x.downloaded = size;
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_master_playlist() {
        let base = Url::parse("https://cdn.example.com/a/master.m3u8").unwrap();
        let text = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\nlow/index.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720,CODECS=\"avc1.4d401f,mp4a.40.2\"\nhigh/index.m3u8\n";
        match parse(text, &base).unwrap() {
            Playlist::Master(v) => {
                assert_eq!(v.len(), 2);
                assert_eq!(v[1].height, 720);
                assert_eq!(v[1].url, "https://cdn.example.com/a/high/index.m3u8");
            }
            _ => panic!("expected master"),
        }
    }

    #[test]
    fn parses_encrypted_media_playlist() {
        let base = Url::parse("https://cdn.example.com/v/index.m3u8").unwrap();
        let text = "#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:7\n#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\",IV=0x00000000000000000000000000000001\n#EXTINF:4.0,\nseg0.ts\n#EXTINF:2.5,\nseg1.ts\n#EXT-X-ENDLIST\n";
        match parse(text, &base).unwrap() {
            Playlist::Media { segments, duration } => {
                assert_eq!(segments.len(), 2);
                assert_eq!(segments[0].seq, 7);
                assert_eq!(segments[1].url, "https://cdn.example.com/v/seg1.ts");
                assert_eq!(segments[0].key.as_ref().unwrap().iv.unwrap()[15], 1);
                assert!((duration - 6.5).abs() < 1e-9);
            }
            _ => panic!("expected media"),
        }
    }

    #[test]
    fn rejects_sample_aes() {
        let base = Url::parse("https://x.test/p.m3u8").unwrap();
        let text = "#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI=\"k\"\n#EXTINF:1,\na.ts\n";
        assert!(parse(text, &base).is_err());
    }

    #[test]
    fn aes_roundtrip() {
        use cbc::cipher::{block_padding::Pkcs7, BlockEncryptMut, KeyIvInit};
        let key = [7u8; 16];
        let iv = [9u8; 16];
        let plain = b"hello hls segment data".to_vec();
        let mut buf = plain.clone();
        buf.resize(plain.len() + 16, 0);
        let enc = cbc::Encryptor::<aes::Aes128>::new_from_slices(&key, &iv)
            .unwrap()
            .encrypt_padded_mut::<Pkcs7>(&mut buf, plain.len())
            .unwrap()
            .to_vec();
        assert_eq!(decrypt(enc, &key, iv).unwrap(), plain);
    }
}
