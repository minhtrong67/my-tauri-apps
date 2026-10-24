//! Figure out what a link points to (direct file, HLS playlist or a page that
//! yt-dlp understands) and describe the available qualities.

use std::sync::Arc;

use reqwest::header::{CONTENT_DISPOSITION, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, RANGE};
use url::Url;

use crate::direct::with_headers;
use crate::hls::{self, Playlist};
use crate::manager::Manager;
use crate::models::*;
use crate::util::*;

fn pct_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

fn filename_from_disposition(v: &str) -> Option<String> {
    let lower = v.to_lowercase();
    if let Some(pos) = lower.find("filename*=") {
        let rest = &v[pos + 10..];
        let rest = rest.split(';').next()?.trim();
        let value = rest.split("''").last()?;
        let decoded = pct_decode(value.trim_matches('"'));
        if !decoded.is_empty() {
            return Some(decoded);
        }
    }
    if let Some(pos) = lower.find("filename=") {
        let rest = &v[pos + 9..];
        let name = rest.split(';').next()?.trim().trim_matches('"');
        if !name.is_empty() {
            return Some(pct_decode(name));
        }
    }
    None
}

fn looks_generic(stem: &str) -> bool {
    let s = stem.to_lowercase();
    let generic = [
        "video", "index", "master", "playlist", "media", "stream", "chunklist", "manifest", "main", "file", "download",
        "play", "output", "movie", "clip",
    ];
    if generic.contains(&s.as_str()) {
        return true;
    }
    let alnum = s.chars().filter(|c| c.is_ascii_alphanumeric()).count();
    s.len() >= 20 && alnum * 10 >= s.len() * 9 && s.chars().any(|c| c.is_ascii_digit())
        || s.chars().all(|c| c.is_ascii_digit())
}

fn pick_name(url: &Url, disposition: Option<&str>, title: Option<&str>, default_ext: &str) -> String {
    let from_url = url
        .path_segments()
        .and_then(|s| s.last())
        .map(pct_decode)
        .filter(|s| !s.is_empty());
    let from_disp = disposition.and_then(filename_from_disposition);
    let page_title = title.map(|t| t.trim()).filter(|t| !t.is_empty());

    let raw = if let Some(n) = from_disp {
        n
    } else if let Some(n) = from_url.clone() {
        let stem = stem_of(&n);
        if looks_generic(&stem) {
            match page_title {
                Some(t) => {
                    let ext = ext_of(&n);
                    format!("{}.{}", t, if ext.is_empty() { default_ext.to_string() } else { ext })
                }
                None => n,
            }
        } else {
            n
        }
    } else if let Some(t) = page_title {
        format!("{t}.{default_ext}")
    } else {
        format!("video.{default_ext}")
    };

    let mut name = sanitize(&raw);
    let ext = ext_of(&name);
    if ext.is_empty() || ext.len() > 5 || !ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        name = format!("{name}.{default_ext}");
    }
    name
}

struct Head {
    content_type: String,
    length: Option<u64>,
    disposition: Option<String>,
}

async fn head(m: &Manager, d: &Download) -> Option<Head> {
    let to_head = |status: reqwest::StatusCode, h: &reqwest::header::HeaderMap, ranged: bool| -> Option<Head> {
        if !status.is_success() {
            return None;
        }
        let ct = h.get(CONTENT_TYPE).and_then(|v| v.to_str().ok()).unwrap_or("").to_lowercase();
        let length = if ranged {
            h.get(CONTENT_RANGE)
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.rsplit('/').next())
                .and_then(|t| t.parse().ok())
        } else {
            h.get(CONTENT_LENGTH).and_then(|v| v.to_str().ok()).and_then(|s| s.parse().ok())
        };
        let disposition = h.get(CONTENT_DISPOSITION).and_then(|v| v.to_str().ok()).map(|s| s.to_string());
        Some(Head { content_type: ct, length, disposition })
    };
    if let Ok(resp) = with_headers(m.http.head(&d.url), d).send().await {
        if let Some(h) = to_head(resp.status(), resp.headers(), false) {
            return Some(h);
        }
    }
    let resp = with_headers(m.http.get(&d.url), d).header(RANGE, "bytes=0-0").send().await.ok()?;
    let ranged = resp.status().as_u16() == 206;
    to_head(resp.status(), resp.headers(), ranged)
}

fn direct_info(url: &Url, req: &Download, title: Option<&str>, h: Option<Head>) -> MediaInfo {
    let disposition = h.as_ref().and_then(|h| h.disposition.clone());
    let ct = h.as_ref().map(|h| h.content_type.clone()).unwrap_or_default();
    let default_ext = if ct.starts_with("audio/") { "mp3" } else { "mp4" };
    let filename = pick_name(url, disposition.as_deref(), title, default_ext);
    let size = h.as_ref().and_then(|h| h.length);
    let ext = ext_of(&filename).to_uppercase();
    MediaInfo {
        kind: Kind::Direct,
        url: url.to_string(),
        title: stem_of(&filename),
        thumbnail: None,
        site: host_of(url.as_str()),
        duration: None,
        uploader: None,
        filename,
        size,
        options: vec![QualityOption {
            id: "original".into(),
            label: "original".into(),
            detail: ext,
            selector: String::new(),
            size,
            ..Default::default()
        }],
        referer: req.referer.clone(),
        user_agent: req.user_agent.clone(),
        cookie: req.cookie.clone(),
    }
}

async fn hls_info(m: &Arc<Manager>, url: &Url, req: &Download, title: Option<&str>) -> Result<MediaInfo, String> {
    let (text, base) = hls::fetch_text(m, req, url.as_str()).await.map_err(|e| match e {
        Stop::Failed(s) => s,
        _ => "Could not read the playlist.".to_string(),
    })?;
    let playlist = hls::parse(&text, &base)?;
    let mut options: Vec<QualityOption> = Vec::new();
    let mut duration = None;
    match playlist {
        Playlist::Master(mut variants) => {
            variants.sort_by(|a, b| b.height.cmp(&a.height).then(b.bandwidth.cmp(&a.bandwidth)));
            variants.dedup_by(|a, b| a.height == b.height && a.height > 0);
            let best = variants.first().map(|v| v.url.clone()).unwrap_or_default();
            options.push(QualityOption {
                id: "best".into(),
                label: "best".into(),
                detail: variants.first().map(|v| if v.height > 0 { format!("{}p", v.height) } else { String::new() }).unwrap_or_default(),
                selector: best,
                height: variants.first().map(|v| v.height).unwrap_or(0),
                ..Default::default()
            });
            for (i, v) in variants.iter().enumerate() {
                let label = if v.height > 0 { format!("{}p", v.height) } else { format!("{} kbps", v.bandwidth / 1000) };
                options.push(QualityOption {
                    id: format!("hls{i}"),
                    label,
                    detail: if v.bandwidth > 0 { format!("{:.1} Mbps", v.bandwidth as f64 / 1_000_000.0) } else { String::new() },
                    selector: v.url.clone(),
                    height: v.height,
                    ..Default::default()
                });
            }
        }
        Playlist::Media { duration: dur, segments } => {
            if segments.is_empty() {
                return Err("The playlist does not contain any video segments.".into());
            }
            duration = Some(dur);
            options.push(QualityOption {
                id: "original".into(),
                label: "original".into(),
                detail: "HLS".into(),
                selector: String::new(),
                ..Default::default()
            });
        }
    }
    let filename = pick_name(url, None, title, "mp4");
    let filename = with_ext(&filename, "mp4");
    Ok(MediaInfo {
        kind: Kind::Hls,
        url: url.to_string(),
        title: stem_of(&filename),
        thumbnail: None,
        site: host_of(url.as_str()),
        duration: duration.filter(|d| *d > 0.0),
        uploader: None,
        filename,
        size: None,
        options,
        referer: req.referer.clone(),
        user_agent: req.user_agent.clone(),
        cookie: req.cookie.clone(),
    })
}

pub async fn analyze(
    m: &Arc<Manager>,
    raw: &str,
    title: Option<String>,
    referer: Option<String>,
    user_agent: Option<String>,
    cookie: Option<String>,
) -> Result<MediaInfo, String> {
    let url = Url::parse(raw.trim()).map_err(|_| "Enter a valid link that starts with http:// or https://".to_string())?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return Err("Enter a valid link that starts with http:// or https://".into());
    }
    let req = Download {
        url: url.to_string(),
        referer: referer.filter(|s| !s.is_empty()),
        user_agent: user_agent.filter(|s| !s.is_empty()),
        cookie: cookie.filter(|s| !s.is_empty()),
        ..Default::default()
    };
    let title = title.filter(|t| !t.trim().is_empty());
    let ext = ext_of(url.path());

    if ext == "m3u8" || ext == "m3u" || url.path().to_lowercase().contains(".m3u8") {
        return hls_info(m, &url, &req, title.as_deref()).await;
    }
    if MEDIA_EXTS.contains(&ext.as_str()) {
        let h = head(m, &req).await;
        return Ok(direct_info(&url, &req, title.as_deref(), h));
    }

    // Unknown extension: look at what the server says.
    let h = head(m, &req).await;
    if let Some(h) = &h {
        let ct = h.content_type.as_str();
        if ct.contains("mpegurl") {
            return hls_info(m, &url, &req, title.as_deref()).await;
        }
        let disp_ext = h.disposition.as_deref().and_then(filename_from_disposition).map(|n| ext_of(&n)).unwrap_or_default();
        if ct.starts_with("video/")
            || ct.starts_with("audio/")
            || ct.contains("application/mp4")
            || (ct.contains("octet-stream") && MEDIA_EXTS.contains(&disp_ext.as_str()))
        {
            let h = head(m, &req).await;
            return Ok(direct_info(&url, &req, title.as_deref(), h));
        }
    }

    let mut info = crate::ytdlp::info(m, url.as_str(), req.referer.as_deref(), req.user_agent.as_deref()).await?;
    info.cookie = req.cookie.clone();
    Ok(info)
}
