//! Online lyrics lookup on LRCLIB (free, no key). Only called when the user asks for it (or turns on "find lyrics automatically").
//!
//! File names are messy ("Artist, Other - Song ft. Someone (Official Video)"), so a plain exact lookup fails often.
//! The search therefore (1) cleans the title, (2) tries several title / artist readings, (3) scores every result by title,
//! artist and length so a wrong song is never returned, and (4) retries when the network or the server hiccups.
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

const API: &str = "https://lrclib.net/api";
/// A result at least this good ends the search early (same title + artist + length within a couple of seconds)
const GOOD_ENOUGH: i32 = 85;
/// Results below this are not trusted
const MIN_SCORE: i32 = 50;

#[derive(Serialize, Clone, Debug)]
pub struct OnlineLyrics {
    pub synced: String,
    pub plain: String,
    /// who / what LRCLIB matched, so the user can see it is the right song
    pub title: String,
    pub artist: String,
}

#[derive(Clone, Debug)]
struct Hit {
    synced: String,
    plain: String,
    title: String,
    artist: String,
    duration: f64,
    instrumental: bool,
}

#[derive(Clone, Debug, PartialEq)]
struct Cand {
    title: String,
    artist: String,
}

// ---------- text helpers ----------

/// Words that only describe the upload, not the song. A bracket is removed when ALL its words are in this list
/// and at least one of them is a STRONG one (so "(Free)" or "(Now)" alone are kept).
const STRONG: [&str; 14] = ["official", "video", "audio", "lyric", "lyrics", "visualizer", "visualiser", "hd", "hq", "4k", "1080p", "mv", "m/v", "clip"];
const WEAK: [&str; 11] = ["music", "full", "song", "free", "download", "out", "now", "explicit", "karaoke", "ft", "feat"];

fn collapse(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Removes (…) […] {…} groups that only contain upload noise such as "(Official Video)"
pub fn strip_noise(s: &str) -> String {
    let mut out = String::new();
    let mut depth_start: Option<(usize, char)> = None;
    let chars: Vec<char> = s.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if depth_start.is_none() && (c == '(' || c == '[' || c == '{') {
            depth_start = Some((i, c));
            i += 1;
            continue;
        }
        if let Some((start, open)) = depth_start {
            let close = match open {
                '(' => ')',
                '[' => ']',
                _ => '}',
            };
            if c == close {
                let inner: String = chars[start + 1..i].iter().collect();
                let low = inner.to_lowercase();
                let words: Vec<&str> = low.split(|ch: char| !ch.is_alphanumeric() && ch != '/').filter(|w| !w.is_empty()).collect();
                let noisy = !words.is_empty()
                    && words.iter().all(|w| STRONG.contains(w) || WEAK.contains(w))
                    && words.iter().any(|w| STRONG.contains(w));
                if !noisy {
                    out.push(open);
                    out.push_str(&inner);
                    out.push(close);
                }
                depth_start = None;
            }
            i += 1;
            continue;
        }
        out.push(c);
        i += 1;
    }
    // an unclosed bracket: keep what was typed
    if let Some((start, _)) = depth_start {
        out.extend(chars[start..].iter());
    }
    collapse(&out)
}

/// "Song ft. Someone" / "Song (feat. Someone)" -> "Song"
pub fn strip_feat(s: &str) -> String {
    let low = s.to_lowercase();
    let mut cut = s.len();
    for tok in [" ft.", " ft ", " feat.", " feat ", " featuring ", "(ft.", "(ft ", "(feat.", "(feat ", "[ft.", "[feat.", "(with ", " with "] {
        if let Some(p) = low.find(tok) {
            if p < cut && p > 0 {
                cut = p;
            }
        }
    }
    // `low` can differ in byte length from `s` for exotic characters: fall back to the original text then
    let head = if low.len() == s.len() && s.is_char_boundary(cut) { &s[..cut] } else { s };
    collapse(head.trim_end_matches(['-', '–', ' ']))
}

/// "A, B & C x D feat. E" -> "A"
fn first_artist(s: &str) -> String {
    let s = strip_feat(s);
    let mut end = s.len();
    for sep in [",", " & ", " x ", " X ", " and ", ";", " / ", " + "] {
        if let Some(p) = s.find(sep) {
            end = end.min(p);
        }
    }
    collapse(&s[..end])
}

fn clean_artist(a: &str) -> String {
    let a = a.trim();
    let a = a.strip_suffix(" - Topic").unwrap_or(a);
    let a = a.strip_suffix("VEVO").map(|x| x.trim_end()).unwrap_or(a);
    collapse(a)
}

/// lower case letters / digits only, single spaces (accents are kept: "Chiều Mưa" stays distinct from "Chieu Mua")
fn norm(s: &str) -> String {
    let t: String = s.to_lowercase().chars().map(|c| if c.is_alphanumeric() { c } else { ' ' }).collect();
    collapse(&t)
}

/// share of words two texts have in common (0..1)
fn overlap(a: &str, b: &str) -> f64 {
    let (a, b) = (norm(a), norm(b));
    let wa: Vec<&str> = a.split(' ').filter(|w| !w.is_empty()).collect();
    let wb: Vec<&str> = b.split(' ').filter(|w| !w.is_empty()).collect();
    if wa.is_empty() || wb.is_empty() {
        return 0.0;
    }
    let common = wa.iter().filter(|w| wb.contains(w)).count() as f64;
    common / wa.len().max(wb.len()) as f64
}

/// Different readings of the file's title / artist, best guess first
fn candidates(title: &str, artist: &str) -> Vec<Cand> {
    let t0 = strip_noise(title);
    let a0 = clean_artist(artist);
    let mut out: Vec<Cand> = Vec::new();
    let mut push = |t: String, a: String| {
        let (t, a) = (collapse(&t), collapse(&a));
        if t.is_empty() || out.iter().any(|c| norm(&c.title) == norm(&t) && norm(&c.artist) == norm(&a)) {
            return;
        }
        out.push(Cand { title: t, artist: a });
    };
    push(t0.clone(), a0.clone());
    push(strip_feat(&t0), a0.clone());
    // "Artist - Title" (the usual YouTube-rip name) and the reverse
    for dash in [" - ", " – ", " — ", " | "] {
        if let Some((left, right)) = t0.split_once(dash) {
            push(strip_feat(right), first_artist(left));
            push(strip_feat(right), a0.clone());
            push(strip_feat(left), a0.clone());
            break;
        }
    }
    push(strip_feat(&t0), first_artist(&a0));
    out
}

// ---------- scoring ----------

fn hit_from(v: &Value) -> Option<Hit> {
    let s = |k: &str| v.get(k).and_then(|x| x.as_str()).unwrap_or("").to_string();
    let h = Hit {
        synced: s("syncedLyrics"),
        plain: s("plainLyrics"),
        title: s("trackName"),
        artist: s("artistName"),
        duration: v.get("duration").and_then(|x| x.as_f64()).unwrap_or(0.0),
        instrumental: v.get("instrumental").and_then(|x| x.as_bool()).unwrap_or(false),
    };
    if h.synced.trim().is_empty() && h.plain.trim().is_empty() {
        None
    } else {
        Some(h)
    }
}

/// How well a result fits what we are looking for; None = reject (wrong song)
fn score(h: &Hit, c: &Cand, duration: f64) -> Option<i32> {
    if h.instrumental {
        return None;
    }
    let (ht, ct) = (norm(&h.title), norm(&c.title));
    let title = if ht == ct {
        60
    } else if !ct.is_empty() && (ht.contains(&ct) || ct.contains(&ht)) && overlap(&h.title, &c.title) >= 0.5 {
        40
    } else if overlap(&h.title, &c.title) >= 0.7 {
        28
    } else {
        return None; // not the same song
    };
    let artist = if norm(&c.artist).is_empty() {
        10 // unknown artist: neutral
    } else {
        let (ha, ca) = (norm(&h.artist), norm(&c.artist));
        if ha == ca {
            30
        } else if ha.contains(&ca) || ca.contains(&ha) {
            22
        } else if overlap(&h.artist, &c.artist) > 0.0 {
            12
        } else {
            0
        }
    };
    let len = if duration > 0.0 && h.duration > 0.0 {
        let d = (duration - h.duration).abs();
        if d <= 2.0 {
            30
        } else if d <= 5.0 {
            18
        } else if d <= 10.0 {
            6
        } else if d <= 20.0 {
            -10
        } else {
            return None; // a different version / song
        }
    } else {
        0
    };
    let synced = if h.synced.trim().is_empty() { 0 } else { 8 };
    let total = title + artist + len + synced;
    // a title-only match with a wrong artist is too risky
    if artist == 0 && !norm(&c.artist).is_empty() && title < 60 {
        return None;
    }
    (total >= MIN_SCORE).then_some(total)
}

fn consider(best: &mut Option<(i32, Hit)>, hits: Vec<Hit>, c: &Cand, duration: f64) {
    for h in hits {
        if let Some(s) = score(&h, c, duration) {
            if best.as_ref().map_or(true, |(b, _)| s > *b) {
                *best = Some((s, h));
            }
        }
    }
}

// ---------- network ----------

/// GET with retries for hiccups (network errors, 429, 5xx). 404 = nothing found.
fn get_json(agent: &ureq::Agent, path: &str, params: &[(&str, String)]) -> Result<Option<Value>, String> {
    let mut last = String::new();
    for attempt in 0..3u64 {
        let mut req = agent.get(&format!("{}/{}", API, path));
        for (k, v) in params {
            req = req.query(k, v);
        }
        match req.call() {
            Ok(r) => return r.into_json::<Value>().map(Some).map_err(|e| e.to_string()),
            Err(ureq::Error::Status(404, _)) => return Ok(None),
            Err(ureq::Error::Status(code, _)) if code == 429 || code >= 500 => last = format!("LRCLIB answered HTTP {}", code),
            Err(ureq::Error::Status(code, _)) => return Err(format!("LRCLIB answered HTTP {}", code)),
            Err(e) => last = e.to_string(),
        }
        if attempt < 2 {
            std::thread::sleep(Duration::from_millis(500 * (attempt + 1)));
        }
    }
    Err(last)
}

fn hits_from(v: Option<Value>) -> Vec<Hit> {
    match v {
        Some(Value::Array(a)) => a.iter().filter_map(hit_from).collect(),
        Some(o @ Value::Object(_)) => hit_from(&o).into_iter().collect(),
        _ => vec![],
    }
}

fn find(title: &str, artist: &str, duration: f64) -> Result<Option<OnlineLyrics>, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(6))
        .timeout(Duration::from_secs(12))
        .user_agent(&format!("Material Music/{} (https://github.com/minhtrong67)", env!("CARGO_PKG_VERSION")))
        .build();
    let cands = candidates(title, artist);
    let mut best: Option<(i32, Hit)> = None;
    let done = |b: &Option<(i32, Hit)>| b.as_ref().map_or(false, |(s, _)| *s >= GOOD_ENOUGH);

    // 1) exact lookup for each reading (cheap, and exact when the tags are right)
    for c in &cands {
        if c.artist.is_empty() {
            continue;
        }
        let mut p = vec![("track_name", c.title.clone()), ("artist_name", c.artist.clone())];
        if duration > 0.0 {
            p.push(("duration", format!("{}", duration.round() as u64)));
        }
        consider(&mut best, hits_from(get_json(&agent, "get", &p)?), c, duration);
        if done(&best) {
            break;
        }
    }
    // 2) structured search: finds songs whose tags differ slightly
    if !done(&best) {
        for c in cands.iter().take(3) {
            let mut p = vec![("track_name", c.title.clone())];
            if !c.artist.is_empty() {
                p.push(("artist_name", c.artist.clone()));
            }
            consider(&mut best, hits_from(get_json(&agent, "search", &p)?), c, duration);
            if done(&best) {
                break;
            }
        }
    }
    // 3) free-text search as the last resort
    if best.is_none() {
        if let Some(c) = cands.first() {
            let q = collapse(&format!("{} {}", c.artist, c.title));
            consider(&mut best, hits_from(get_json(&agent, "search", &[("q", q)])?), c, duration);
            if best.is_none() && !c.artist.is_empty() {
                consider(&mut best, hits_from(get_json(&agent, "search", &[("q", c.title.clone())])?), &Cand { title: c.title.clone(), artist: String::new() }, duration);
            }
        }
    }
    Ok(best.map(|(_, h)| OnlineLyrics { synced: h.synced, plain: h.plain, title: h.title, artist: h.artist }))
}

/// Look the lyrics up on LRCLIB. `album` is accepted for compatibility but not used: in most libraries it is just the folder name.
#[tauri::command]
pub async fn fetch_lyrics_online(title: String, artist: String, album: String, duration: f64) -> Result<Option<OnlineLyrics>, String> {
    let _ = album;
    tauri::async_runtime::spawn_blocking(move || find(&title, &artist, duration)).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hit(title: &str, artist: &str, duration: f64, synced: bool) -> Hit {
        Hit { synced: if synced { "[00:01.00]x".into() } else { String::new() }, plain: "x".into(), title: title.into(), artist: artist.into(), duration, instrumental: false }
    }

    #[test]
    fn removes_upload_noise_but_keeps_real_brackets() {
        assert_eq!(strip_noise("Feel Good (Official Video)"), "Feel Good");
        assert_eq!(strip_noise("Song [Lyrics] (HD)"), "Song");
        assert_eq!(strip_noise("Song (Official Music Video) [4K]"), "Song");
        assert_eq!(strip_noise("Song (Acoustic Version)"), "Song (Acoustic Version)");
        assert_eq!(strip_noise("Song (feat. Someone)"), "Song (feat. Someone)");
        assert_eq!(strip_noise("Broken (bracket"), "Broken (bracket");
    }

    #[test]
    fn removes_featured_artists() {
        assert_eq!(strip_feat("Feel Good ft. Daya"), "Feel Good");
        assert_eq!(strip_feat("Feel Good (feat. Daya)"), "Feel Good");
        assert_eq!(strip_feat("Feel Good"), "Feel Good");
        assert_eq!(first_artist("Gryffin, ILLENIUM"), "Gryffin");
        assert_eq!(first_artist("A & B"), "A");
    }

    #[test]
    fn reads_artist_dash_title_names() {
        let c = candidates("Gryffin, ILLENIUM - Feel Good ft. Daya (Official Video)", "GRYFFIN");
        assert!(c.contains(&Cand { title: "Feel Good".into(), artist: "Gryffin".into() }));
        assert_eq!(c[0].title, "Gryffin, ILLENIUM - Feel Good ft. Daya");
    }

    #[test]
    fn scoring_prefers_the_right_song() {
        let c = Cand { title: "Feel Good".into(), artist: "Gryffin".into() };
        let right = score(&hit("Feel Good", "Gryffin", 246.0, true), &c, 246.0).unwrap();
        let other_len = score(&hit("Feel Good", "Gryffin", 300.0, true), &c, 246.0);
        let other_song = score(&hit("Feel Good Inc.", "Gorillaz", 246.0, true), &c, 246.0);
        assert!(right >= GOOD_ENOUGH);
        assert!(other_len.is_none());
        assert!(other_song.is_none());
    }

    #[test]
    fn unknown_length_and_artist_are_tolerated() {
        let c = Cand { title: "Hoa Nắng".into(), artist: String::new() };
        assert!(score(&hit("Hoa Nắng", "Mai Linh", 200.0, false), &c, 0.0).is_some());
    }

    #[test]
    fn instrumentals_are_rejected() {
        let mut h = hit("Song", "A", 100.0, true);
        h.instrumental = true;
        assert!(score(&h, &Cand { title: "Song".into(), artist: "A".into() }, 100.0).is_none());
    }
}
