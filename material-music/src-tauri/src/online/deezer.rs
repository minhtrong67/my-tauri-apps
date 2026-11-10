//! Deezer public search API: covers every big release, but only 30-second previews are free.
use super::http::{agent, get_json, id_of, num, text};
use super::OnlineTrack;
use serde_json::Value;

const API: &str = "https://api.deezer.com";

fn api_error(v: &Value) -> Option<String> {
    v.get("error").map(|e| format!("E_HTTP: {}", e.get("message").and_then(Value::as_str).unwrap_or("Deezer error")))
}

pub fn parse_tracks(v: &Value) -> Vec<OnlineTrack> {
    let Some(arr) = v.get("data").and_then(Value::as_array) else { return vec![] };
    arr.iter()
        .filter_map(|t| {
            let id = id_of(t, "id");
            let title = text(t, "title");
            if id.is_empty() || title.is_empty() || text(t, "preview").is_empty() {
                return None;
            }
            let album = t.get("album");
            let cover = ["cover_big", "cover_medium", "cover_xl"]
                .iter()
                .find_map(|k| album.and_then(|a| a.get(*k)).and_then(Value::as_str))
                .unwrap_or("")
                .to_string();
            Some(OnlineTrack {
                source: "deezer".into(),
                id,
                title,
                artist: t.pointer("/artist/name").and_then(Value::as_str).unwrap_or("").trim().to_string(),
                album: album.map(|a| text(a, "title")).unwrap_or_default(),
                // the free preview is a 30 s excerpt, so that is the length the player shows
                duration: num(t, "duration").clamp(1.0, 30.0),
                cover_url: cover,
                preview: true,
            })
        })
        .collect()
}

pub fn search(q: &str, limit: usize) -> Result<Vec<OnlineTrack>, String> {
    let v = get_json(&agent(), &format!("{API}/search/track"), &[("q", q), ("limit", &limit.to_string())])?;
    if let Some(e) = api_error(&v) {
        return Err(e);
    }
    Ok(parse_tracks(&v))
}

/// Preview links carry a short-lived token, so they are fetched right before playing
pub fn preview_url(id: &str) -> Result<String, String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
        return Err("E_BAD_ID".into());
    }
    let v = get_json(&agent(), &format!("{API}/track/{id}"), &[])?;
    if let Some(e) = api_error(&v) {
        return Err(e);
    }
    let url = text(&v, "preview");
    if url.starts_with("https://") || url.starts_with("http://") {
        Ok(url)
    } else {
        Err("E_NO_PREVIEW".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_previews() {
        let v = serde_json::json!({"data": [
            {"id": 3135556, "title": "Harder", "duration": 224, "preview": "https://cdn/p.mp3", "artist": {"name": "Daft Punk"}, "album": {"title": "Discovery", "cover_big": "https://c/b.jpg"}},
            {"id": 1, "title": "No preview", "duration": 10, "preview": ""}
        ]});
        let t = parse_tracks(&v);
        assert_eq!(t.len(), 1);
        assert!(t[0].preview);
        assert_eq!(t[0].duration, 30.0);
        assert_eq!(t[0].album, "Discovery");
    }

    #[test]
    fn rejects_odd_ids() {
        assert!(preview_url("12/../3").is_err());
    }
}
