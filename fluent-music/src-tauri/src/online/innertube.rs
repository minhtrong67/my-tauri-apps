//! YouTube Music search through the same public endpoint the music.youtube.com web page uses (no key, no login).
//! It is fast (one request, no helper program) and returns real song data: title, artist, album, length and square cover art.
//! Playing is a different matter and is done by yt-dlp (see `youtube.rs`), because the stream side of YouTube changes constantly.
use super::http::{agent, post_json};
use super::OnlineTrack;
use serde_json::{json, Value};

const ENDPOINT: &str = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false&key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
/// result filters of YouTube Music search ("Songs" / "Videos" chips)
const SONGS: &str = "EgWKAQIIAWoMEA4QChADEAQQCRAF";
const VIDEOS: &str = "EgWKAQIQAWoMEA4QChADEAQQCRAF";
const BROWSER_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0";

/// "2026-11-07" style date parts from a unix time (the web client version is `1.YYYYMMDD.01.00`, so it always looks current)
pub fn ymd(unix_secs: u64) -> (u64, u64, u64) {
    let z = (unix_secs / 86400) as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    ((if m <= 2 { y + 1 } else { y }) as u64, m as u64, d as u64)
}

fn client_version() -> String {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let (y, m, d) = ymd(now);
    format!("1.{y:04}{m:02}{d:02}.01.00")
}

pub fn search(q: &str, videos: bool, limit: usize) -> Result<Vec<OnlineTrack>, String> {
    let body = json!({
        "context": { "client": { "clientName": "WEB_REMIX", "clientVersion": client_version(), "hl": "en", "gl": "US" }, "user": {} },
        "query": q,
        "params": if videos { VIDEOS } else { SONGS },
    });
    let headers = [
        ("User-Agent", BROWSER_UA),
        ("Accept-Language", "en-US,en;q=0.5"),
        ("Origin", "https://music.youtube.com"),
        ("Referer", "https://music.youtube.com/"),
        ("Cookie", "SOCS=CAI"), // skips the cookie-consent page shown in some regions
        ("X-Goog-Api-Format-Version", "1"),
    ];
    let v = post_json(&agent(), ENDPOINT, &headers, &body)?;
    let mut tracks = parse_search(&v, videos);
    tracks.truncate(limit);
    Ok(tracks)
}

fn collect<'a>(v: &'a Value, out: &mut Vec<&'a Value>) {
    match v {
        Value::Object(m) => {
            for (k, x) in m {
                if k == "musicResponsiveListItemRenderer" {
                    out.push(x);
                } else {
                    collect(x, out);
                }
            }
        }
        Value::Array(a) => a.iter().for_each(|x| collect(x, out)),
        _ => {}
    }
}

/// text runs of a flex column, split at the " • " separators
fn groups(col: &Value) -> Vec<String> {
    let runs = col.pointer("/musicResponsiveListItemFlexColumnRenderer/text/runs").and_then(Value::as_array);
    let mut out = vec![String::new()];
    for r in runs.into_iter().flatten() {
        let t = r.get("text").and_then(Value::as_str).unwrap_or("");
        if t.trim() == "•" {
            out.push(String::new());
        } else if let Some(last) = out.last_mut() {
            last.push_str(t);
        }
    }
    out.into_iter().map(|g| g.trim().to_string()).filter(|g| !g.is_empty()).collect()
}

/// "3:45" / "1:02:03" -> seconds
pub fn parse_duration(s: &str) -> Option<f64> {
    let parts: Vec<&str> = s.trim().split(':').collect();
    if parts.len() < 2 || parts.len() > 3 || !parts.iter().all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit())) {
        return None;
    }
    Some(parts.iter().fold(0.0, |acc, p| acc * 60.0 + p.parse::<f64>().unwrap_or(0.0)))
}

/// googleusercontent covers come as `…=w226-h226-l90-rj`: ask for a bigger square
pub fn big_cover(url: &str) -> String {
    if let Some(i) = url.rfind("=w") {
        if url[i + 2..].chars().next().is_some_and(|c| c.is_ascii_digit()) && (url.contains("googleusercontent.com") || url.contains("ggpht.com")) {
            return format!("{}=w544-h544-l90-rj", &url[..i]);
        }
    }
    url.to_string()
}

fn parse_item(it: &Value, videos: bool) -> Option<OnlineTrack> {
    let id = it
        .pointer("/playlistItemData/videoId")
        .or_else(|| it.pointer("/overlay/musicItemThumbnailOverlayRenderer/content/musicPlayButtonRenderer/playNavigationEndpoint/watchEndpoint/videoId"))
        .and_then(Value::as_str)?
        .to_string();
    if id.len() != 11 {
        return None;
    }
    let cols = it.get("flexColumns").and_then(Value::as_array)?;
    let title = groups(cols.first()?).into_iter().next()?;
    let mut meta = cols.get(1).map(groups).unwrap_or_default();
    if meta.first().is_some_and(|g| ["Song", "Video", "Single"].contains(&g.as_str())) {
        meta.remove(0);
    }
    let duration = meta.iter().rev().find_map(|g| parse_duration(g)).unwrap_or(0.0);
    if !(20.0..=2400.0).contains(&duration) {
        return None;
    }
    let artist = meta.first().filter(|g| parse_duration(g).is_none()).cloned().unwrap_or_default();
    let album = if videos {
        String::new()
    } else {
        meta.get(1).filter(|g| parse_duration(g).is_none() && !g.contains("views") && !g.contains("plays")).cloned().unwrap_or_default()
    };
    let (artist, title) = if videos { super::youtube::split_title(&title, &artist) } else { (artist, title) };
    let cover = it
        .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(Value::as_array)
        .and_then(|a| a.last())
        .and_then(|t| t.get("url"))
        .and_then(Value::as_str)
        .map(big_cover)
        .unwrap_or_else(|| format!("https://i.ytimg.com/vi/{id}/mqdefault.jpg"));
    Some(OnlineTrack { source: "youtube".into(), id, title, artist, album, duration, cover_url: cover })
}

pub fn parse_search(v: &Value, videos: bool) -> Vec<OnlineTrack> {
    let mut items = Vec::new();
    collect(v, &mut items);
    let mut seen = std::collections::HashSet::new();
    items.into_iter().filter_map(|i| parse_item(i, videos)).filter(|t| seen.insert(t.id.clone())).collect()
}

// ---------- stream resolving ----------
// The player endpoint answers with direct stream URLs. Which "client identity" gets URLs that really play changes every few
// months (YouTube asks some clients for a proof-of-origin token). So several identities are tried: the first one at once and
// the others a moment later in parallel; every candidate URL is probed with a 2-byte range request and the first that answers wins.
// This is the same idea SimpMusic / Metrolist use (a list of clients + a 403 probe), without bundling a JavaScript engine.
use std::sync::mpsc;
use std::time::Duration;

#[derive(Clone, Copy)]
struct Client {
    name: &'static str,
    id: &'static str,
    version: &'static str,
    ua: &'static str,
    /// extra fields of `context.client`
    extra: &'static str,
    /// delay before this identity is started (the best identity starts at once)
    delay_ms: u64,
    embed: bool,
}

const CLIENTS: &[Client] = &[
    // JS-less, no proof-of-origin token needed (yt-dlp's default when no JavaScript runtime is present)
    Client {
        name: "VISIONOS",
        id: "101",
        version: "1.02",
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
        extra: r#"{"deviceMake":"Apple","deviceModel":"RealityDevice17,1","osName":"visionOS","osVersion":"26.5.23O471"}"#,
        delay_ms: 0,
        embed: false,
    },
    // embedded player: no token, but only works for videos that allow embedding
    Client {
        name: "WEB_EMBEDDED_PLAYER",
        id: "56",
        version: "1.20260115.01.00",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        extra: r#"{}"#,
        delay_ms: 700,
        embed: true,
    },
    Client {
        name: "IOS",
        id: "5",
        version: "21.02.3",
        ua: "com.google.ios.youtube/21.02.3 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
        extra: r#"{"deviceMake":"Apple","deviceModel":"iPhone16,2","osName":"iPhone","osVersion":"18.3.2.22D82"}"#,
        delay_ms: 1400,
        embed: false,
    },
    Client {
        name: "ANDROID_VR",
        id: "28",
        version: "1.65.10",
        ua: "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
        extra: r#"{"deviceMake":"Oculus","deviceModel":"Quest 3","osName":"Android","osVersion":"12L","androidSdkVersion":32}"#,
        delay_ms: 2000,
        embed: false,
    },
    // a newer VR build: another token-free identity in case the ones above are rejected
    Client {
        name: "ANDROID_VR",
        id: "28",
        version: "1.71.26",
        ua: "com.google.android.apps.youtube.vr.oculus/1.71.26 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
        extra: r#"{"deviceMake":"Oculus","deviceModel":"Quest 3","osName":"Android","osVersion":"12L","androidSdkVersion":32}"#,
        delay_ms: 2600,
        embed: false,
    },
];

pub struct Stream {
    pub url: String,
    pub ua: String,
    /// name of the client identity that produced it
    pub client: &'static str,
    #[allow(dead_code)]
    pub bitrate: u64,
}

pub fn valid_id(id: &str) -> bool {
    id.len() == 11 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn player_body(c: &Client, id: &str) -> Value {
    let mut client: Value = serde_json::from_str(c.extra).unwrap_or_else(|_| json!({}));
    client["clientName"] = json!(c.name);
    client["clientVersion"] = json!(c.version);
    client["userAgent"] = json!(c.ua);
    client["hl"] = json!("en");
    client["gl"] = json!("US");
    let mut context = json!({ "client": client, "user": { "lockedSafetyMode": false } });
    if c.embed {
        context["thirdParty"] = json!({ "embedUrl": "https://www.youtube.com/" });
    }
    json!({
        "context": context,
        "videoId": id,
        "playbackContext": { "contentPlaybackContext": { "html5Preference": "HTML5_PREF_WANTS" } },
        "contentCheckOk": true,
        "racyCheckOk": true,
    })
}

/// best audio-only stream that has a plain URL: AAC (plays in every web view) first, then Opus; higher bitrate wins
pub fn pick_audio(v: &Value) -> Option<Stream> {
    let status = v.pointer("/playabilityStatus/status").and_then(Value::as_str).unwrap_or("OK");
    if status != "OK" {
        return None;
    }
    let formats = v.pointer("/streamingData/adaptiveFormats")?.as_array()?;
    let mut best: Option<(u8, u64, String, String)> = None;
    for f in formats {
        let mime = f.get("mimeType").and_then(Value::as_str).unwrap_or("");
        if !mime.starts_with("audio/") {
            continue;
        }
        // a format with only `signatureCipher` needs the player script: not usable here
        let Some(url) = f.get("url").and_then(Value::as_str) else { continue };
        if f.pointer("/audioTrack/audioIsDefault") == Some(&Value::Bool(false)) {
            continue; // dubbed track
        }
        let rank = if mime.starts_with("audio/mp4") { 2 } else { 1 };
        let br = f.get("bitrate").and_then(Value::as_u64).unwrap_or(0);
        if best.as_ref().is_none_or(|(r, b, _, _)| (rank, br) > (*r, *b)) {
            best = Some((rank, br, url.to_string(), mime.split(';').next().unwrap_or(mime).to_string()));
        }
    }
    best.map(|(_, bitrate, url, _)| Stream { url, ua: String::new(), client: "", bitrate })
}

fn fetch_stream(c: &Client, id: &str) -> Result<Stream, String> {
    let url = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
    let headers = [
        ("User-Agent", c.ua),
        ("X-YouTube-Client-Name", c.id),
        ("X-YouTube-Client-Version", c.version),
        ("Origin", "https://www.youtube.com"),
        ("Cookie", "SOCS=CAI"),
    ];
    let v = post_json(&agent(), url, &headers, &player_body(c, id))?;
    let status = v.pointer("/playabilityStatus/status").and_then(Value::as_str).unwrap_or("");
    let mut s = pick_audio(&v).ok_or_else(|| match status {
        "LOGIN_REQUIRED" => "E_LOGIN".to_string(),
        "UNPLAYABLE" | "ERROR" => "E_UNAVAILABLE".to_string(),
        _ => "E_FORMAT".to_string(),
    })?;
    s.ua = c.ua.to_string();
    s.client = c.name;
    Ok(s)
}

/// Reads the first bytes the same way the player will (bounded range, same headers). A rejected URL (403), an empty answer or a
/// stream that stops at once is caught here instead of in the audio element, and the next client identity is used.
fn probe(s: &Stream) -> bool {
    use std::io::Read;
    let agent = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(5)).timeout(Duration::from_secs(10)).build();
    let Ok(r) = agent.get(&s.url).set("User-Agent", &s.ua).set("Range", "bytes=0-32767").call() else { return false };
    if r.status() != 200 && r.status() != 206 {
        return false;
    }
    let ctype = r.content_type().to_string();
    if !(ctype.starts_with("audio/") || ctype.starts_with("video/") || ctype == "application/octet-stream") {
        return false;
    }
    let mut buf = Vec::new();
    if !(r.into_reader().take(32768).read_to_end(&mut buf).is_ok() && buf.len() >= 1024) {
        return false;
    }
    // some identities hand out URLs whose first bytes work but later ranges are refused: check a range deeper in the file too
    match agent.get(&s.url).set("User-Agent", &s.ua).set("Range", "bytes=1048576-1049599").call() {
        Ok(r) => r.status() == 200 || r.status() == 206,
        Err(ureq::Error::Status(416, _)) => true, // shorter than 1 MB: nothing deeper to refuse
        Err(_) => false,
    }
}

/// Resolves a playable audio stream for a video id. Identities run in parallel (staggered); the first probed URL wins.
/// the identity that worked last time starts first (no waiting for the ones before it that tend to fail)
static LAST_GOOD: std::sync::Mutex<Option<&'static str>> = std::sync::Mutex::new(None);

pub fn resolve(id: &str) -> Result<Stream, String> {
    resolve_skip(id, &[])
}

/// `skip`: identities whose streams already failed for this video (a refresh must not return the same broken kind of URL)
pub fn resolve_skip(id: &str, skip: &[String]) -> Result<Stream, String> {
    if !valid_id(id) {
        return Err("E_BAD_ID".into());
    }
    let good = LAST_GOOD.lock().ok().and_then(|g| *g);
    let mut order: Vec<Client> = CLIENTS.iter().copied().filter(|c| !skip.iter().any(|s| s == c.name)).collect();
    if order.is_empty() {
        order = CLIENTS.to_vec(); // everything failed once: start over rather than give up
    }
    order.sort_by_key(|c| if Some(c.name) == good { 0 } else { 1 });
    let (tx, rx) = mpsc::channel::<Result<Stream, String>>();
    let n = order.len();
    for (k, c) in order.into_iter().enumerate() {
        let tx = tx.clone();
        let id = id.to_string();
        std::thread::spawn(move || {
            // staggered: the first at once, the others only if the first has not answered after a short while
            let delay = if k == 0 { 0 } else { 350 * k as u64 };
            if delay > 0 {
                std::thread::sleep(Duration::from_millis(delay));
            }
            let r = fetch_stream(&c, &id).and_then(|s| if probe(&s) { Ok(s) } else { Err("E_FORBIDDEN".to_string()) });
            let _ = tx.send(r);
        });
    }
    drop(tx);
    let mut last = "E_FORMAT".to_string();
    // hard budget: waiting half a minute for a song is worse than a clear error
    let deadline = std::time::Instant::now() + Duration::from_secs(9);
    for _ in 0..n {
        match rx.recv_timeout(deadline.saturating_duration_since(std::time::Instant::now())) {
            Ok(Ok(s)) => {
                if let Ok(mut g) = LAST_GOOD.lock() {
                    *g = Some(s.client);
                }
                return Ok(s);
            }
            Ok(Err(e)) => {
                // a single identity may be rejected as "unplayable" (outdated version, missing token) while another works:
                // keep waiting, and report the most specific failure at the end
                let rank = |c: &str| match c {
                    "E_FORMAT" => 0,
                    "E_FORBIDDEN" => 1,
                    "E_LOGIN" => 2,
                    "E_UNAVAILABLE" => 3,
                    _ => 4,
                };
                if rank(&e) >= rank(&last) {
                    last = e;
                }
            }
            Err(_) => break,
        }
    }
    Err(last)
}

/// image bytes of a cover (only YouTube / Google image hosts), used to derive the theme colour
pub fn fetch_image(url: &str) -> Result<Vec<u8>, String> {
    use std::io::Read;
    let host = url.strip_prefix("https://").and_then(|r| r.split('/').next()).unwrap_or("");
    let ok = ["googleusercontent.com", "ggpht.com", "ytimg.com"].iter().any(|d| host == *d || host.ends_with(&format!(".{d}")));
    if !ok {
        return Err("E_BAD_URL".into());
    }
    let resp = agent().get(url).set("User-Agent", BROWSER_UA).call().map_err(super::http::map_err)?;
    let mut buf = Vec::new();
    resp.into_reader().take(4 * 1024 * 1024).read_to_end(&mut buf).map_err(|e| format!("E_NETWORK: {e}"))?;
    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn song(id: &str, title: &str, meta: &[&str]) -> Value {
        let mut runs = Vec::new();
        for (i, m) in meta.iter().enumerate() {
            if i > 0 {
                runs.push(json!({"text": " • "}));
            }
            runs.push(json!({"text": m}));
        }
        json!({"musicResponsiveListItemRenderer": {
            "playlistItemData": {"videoId": id},
            "thumbnail": {"musicThumbnailRenderer": {"thumbnail": {"thumbnails": [
                {"url": "https://lh3.googleusercontent.com/abc=w60-h60-l90-rj"}, {"url": "https://lh3.googleusercontent.com/abc=w226-h226-l90-rj"}]}}},
            "flexColumns": [
                {"musicResponsiveListItemFlexColumnRenderer": {"text": {"runs": [{"text": title}]}}},
                {"musicResponsiveListItemFlexColumnRenderer": {"text": {"runs": runs}}}
            ]}})
    }

    fn wrap(items: Vec<Value>) -> Value {
        json!({"contents": {"tabbedSearchResultsRenderer": {"tabs": [{"tabRenderer": {"content": {"sectionListRenderer": {"contents": [
            {"musicShelfRenderer": {"contents": items}}]}}}}]}}})
    }

    #[test]
    fn parses_songs() {
        let v = wrap(vec![
            song("rtOvBOTyX00", "Closer", &["The Chainsmokers & Halsey", "Closer", "4:22"]),
            song("aaaaaaaaaaa", "Song With Type Prefix", &["Song", "Some Artist", "Some Album", "3:01"]),
            json!({"musicResponsiveListItemRenderer": {"flexColumns": []}}),
        ]);
        let t = parse_search(&v, false);
        assert_eq!(t.len(), 2);
        assert_eq!((t[0].title.as_str(), t[0].artist.as_str(), t[0].album.as_str()), ("Closer", "The Chainsmokers & Halsey", "Closer"));
        assert_eq!(t[0].duration, 262.0);
        assert!(t[0].cover_url.ends_with("=w544-h544-l90-rj"));
        assert_eq!((t[1].artist.as_str(), t[1].album.as_str(), t[1].duration), ("Some Artist", "Some Album", 181.0));
    }

    #[test]
    fn parses_videos_and_splits_titles() {
        let v = wrap(vec![song("bbbbbbbbbbb", "Daft Punk - One More Time (Official Video)", &["Daft Punk", "1.2B views", "5:20"])]);
        let t = parse_search(&v, true);
        assert_eq!(t.len(), 1);
        assert_eq!((t[0].artist.as_str(), t[0].title.as_str(), t[0].album.as_str()), ("Daft Punk", "One More Time", ""));
        assert_eq!(t[0].duration, 320.0);
    }

    #[test]
    fn skips_duplicates_and_non_songs() {
        let v = wrap(vec![
            song("ccccccccccc", "A", &["X", "Y", "3:00"]),
            song("ccccccccccc", "A again", &["X", "Y", "3:00"]),
            song("ddddddddddd", "Too long", &["X", "Y", "3:10:00"]),
            song("eeeeeeeeeee", "No length", &["X", "Y"]),
            song("short", "Bad id", &["X", "Y", "3:00"]),
        ]);
        assert_eq!(parse_search(&v, false).len(), 1);
    }

    #[test]
    fn durations_and_dates() {
        assert_eq!(parse_duration("3:45"), Some(225.0));
        assert_eq!(parse_duration("1:02:03"), Some(3723.0));
        assert_eq!(parse_duration("1.2M views"), None);
        assert_eq!(parse_duration("3:"), None);
        assert_eq!(ymd(0), (1970, 1, 1));
        assert_eq!(ymd(1_794_000_000), (2026, 11, 6));
    }

    #[test]
    fn covers_are_enlarged_only_for_google_hosts() {
        assert_eq!(big_cover("https://lh3.googleusercontent.com/x=w226-h226"), "https://lh3.googleusercontent.com/x=w544-h544-l90-rj");
        assert_eq!(big_cover("https://i.ytimg.com/vi/x/hq.jpg"), "https://i.ytimg.com/vi/x/hq.jpg");
    }

    #[test]
    fn picks_aac_first_and_skips_ciphered_formats() {
        let v = json!({"playabilityStatus": {"status": "OK"}, "streamingData": {"adaptiveFormats": [
            {"mimeType": "video/mp4; codecs=\"avc1\"", "url": "https://v", "bitrate": 9},
            {"mimeType": "audio/webm; codecs=\"opus\"", "url": "https://opus", "bitrate": 160000},
            {"mimeType": "audio/mp4; codecs=\"mp4a.40.2\"", "url": "https://aac-low", "bitrate": 48000},
            {"mimeType": "audio/mp4; codecs=\"mp4a.40.2\"", "url": "https://aac", "bitrate": 130000},
            {"mimeType": "audio/mp4; codecs=\"mp4a.40.2\"", "signatureCipher": "s=x", "bitrate": 999999}]}});
        let s = pick_audio(&v).unwrap();
        assert_eq!((s.url.as_str(), s.bitrate), ("https://aac", 130000));
        let bad = json!({"playabilityStatus": {"status": "LOGIN_REQUIRED"}, "streamingData": {"adaptiveFormats": []}});
        assert!(pick_audio(&bad).is_none());
    }

    #[test]
    fn player_body_has_client_identity() {
        let b = player_body(&CLIENTS[0], "rtOvBOTyX00");
        assert_eq!(b["context"]["client"]["clientName"], "VISIONOS");
        assert_eq!(b["videoId"], "rtOvBOTyX00");
        assert!(b["contentCheckOk"].as_bool().unwrap());
        assert!(player_body(&CLIENTS[1], "rtOvBOTyX00")["context"]["thirdParty"].is_object());
    }

    #[test]
    fn image_hosts_are_whitelisted() {
        assert!(fetch_image("https://evil.example/x.jpg").is_err());
        assert!(fetch_image("http://i.ytimg.com/x.jpg").is_err());
    }
}
