//! Audius: open music platform (artist uploads), full-length streams, no key needed.
use super::http::{agent, get_json, id_of, num, text};
use super::OnlineTrack;
use serde_json::Value;
use std::sync::Mutex;

const GATEWAY: &str = "https://api.audius.co";
const APP: &str = "MaterialMusic";
/// host that answered last (the gateway until a discovery node was picked)
static BASE: Mutex<String> = Mutex::new(String::new());

fn base() -> String {
    let b = BASE.lock().map(|g| g.clone()).unwrap_or_default();
    if b.is_empty() { GATEWAY.to_string() } else { b }
}

fn set_base(b: &str) {
    if let Ok(mut g) = BASE.lock() {
        *g = b.to_string();
    }
}

/// other discovery nodes (used only when the gateway itself does not answer)
fn discover() -> Vec<String> {
    let a = agent();
    get_json(&a, GATEWAY, &[])
        .ok()
        .and_then(|v| v.get("data").and_then(Value::as_array).cloned())
        .map(|a| a.iter().filter_map(|x| x.as_str()).filter(|h| h.starts_with("https://")).map(|h| h.trim_end_matches('/').to_string()).take(4).collect())
        .unwrap_or_default()
}

pub fn parse_tracks(v: &Value) -> Vec<OnlineTrack> {
    let Some(arr) = v.get("data").and_then(Value::as_array) else { return vec![] };
    arr.iter()
        .filter_map(|t| {
            let id = id_of(t, "id");
            let title = text(t, "title");
            if id.is_empty() || title.is_empty() {
                return None;
            }
            // deleted, gated (followers / purchase only) or non-streamable uploads cannot be played
            if t.get("is_delete").and_then(Value::as_bool) == Some(true) || t.get("is_streamable").and_then(Value::as_bool) == Some(false) {
                return None;
            }
            if t.pointer("/access/stream").and_then(Value::as_bool) == Some(false) {
                return None;
            }
            let art = t.get("artwork");
            let cover = ["480x480", "150x150", "1000x1000"]
                .iter()
                .find_map(|k| art.and_then(|a| a.get(*k)).and_then(Value::as_str))
                .unwrap_or("")
                .to_string();
            Some(OnlineTrack {
                source: "audius".into(),
                id,
                title,
                artist: t.pointer("/user/name").and_then(Value::as_str).unwrap_or("").trim().to_string(),
                album: String::new(),
                duration: num(t, "duration"),
                cover_url: cover,
                preview: false,
            })
        })
        .collect()
}

pub fn search(q: &str, limit: usize) -> Result<Vec<OnlineTrack>, String> {
    let a = agent();
    let limit_s = limit.to_string();
    let mut hosts = vec![base()];
    let mut tried_discovery = false;
    let mut last = String::from("E_NETWORK");
    let mut i = 0;
    while i < hosts.len() {
        let host = hosts[i].clone();
        i += 1;
        match get_json(&a, &format!("{host}/v1/tracks/search"), &[("query", q), ("limit", &limit_s), ("app_name", APP)]) {
            Ok(v) => {
                set_base(&host);
                return Ok(parse_tracks(&v));
            }
            Err(e) => last = e,
        }
        if i == hosts.len() && !tried_discovery {
            tried_discovery = true;
            for h in discover() {
                if !hosts.contains(&h) {
                    hosts.push(h);
                }
            }
        }
    }
    Err(last)
}

/// The stream URL answers with a redirect to a content node; the local proxy follows it.
pub fn stream_url(id: &str, fresh: bool) -> Result<String, String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err("E_BAD_ID".into());
    }
    if fresh {
        set_base(GATEWAY);
    }
    Ok(format!("{}/v1/tracks/{}/stream?app_name={}", base(), id, APP))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_streamable_tracks_only() {
        let v: Value = serde_json::json!({"data": [
            {"id": "D7KyD", "title": "Song A", "duration": 201, "user": {"name": "Artist A"}, "artwork": {"150x150": "https://x/150.jpg", "480x480": "https://x/480.jpg"}},
            {"id": "gated", "title": "Locked", "duration": 100, "user": {"name": "B"}, "access": {"stream": false}},
            {"id": "off", "title": "Off", "duration": 100, "user": {"name": "B"}, "is_streamable": false},
            {"id": "", "title": "No id"}
        ]});
        let t = parse_tracks(&v);
        assert_eq!(t.len(), 1);
        assert_eq!(t[0].artist, "Artist A");
        assert_eq!(t[0].cover_url, "https://x/480.jpg");
        assert_eq!(t[0].duration, 201.0);
    }

    #[test]
    fn rejects_odd_ids() {
        assert!(stream_url("../x", false).is_err());
        assert!(stream_url("abc123", false).unwrap().contains("/v1/tracks/abc123/stream"));
    }
}
