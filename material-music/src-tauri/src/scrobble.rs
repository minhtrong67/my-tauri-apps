//! Optional ListenBrainz scrobbling. Only runs when the user pastes a token in Settings;
//! the web view itself still has no network access, so the request is made here.
#![allow(unused_imports)]
use serde::Deserialize;
use serde_json::json;
use std::time::Duration;

const API: &str = "https://api.listenbrainz.org/1";

#[derive(Deserialize)]
pub struct ListenMeta {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    /// UNIX seconds when the song started (ignored for "playing now")
    pub listened_at: Option<i64>,
}

fn clip(s: &str) -> String {
    s.chars().take(250).collect()
}

fn post(token: &str, body: serde_json::Value) -> Result<(), String> {
    let token = token.trim();
    if token.is_empty() || token.len() > 100 || !token.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("Invalid token".to_string());
    }
    ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(12))
        .build()
        .post(&format!("{}/submit-listens", API))
        .set("Authorization", &format!("Token {}", token))
        .send_json(body)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn track_metadata(m: &ListenMeta) -> serde_json::Value {
    let mut info = json!({ "media_player": "Material Music", "submission_client": "Material Music" });
    if m.duration.is_finite() && m.duration > 0.0 {
        info["duration_ms"] = json!((m.duration * 1000.0) as i64);
    }
    let mut meta = json!({ "artist_name": clip(&m.artist), "track_name": clip(&m.title), "additional_info": info });
    if !m.album.trim().is_empty() {
        meta["release_name"] = json!(clip(&m.album));
    }
    meta
}

/// "Now playing" (shown on the profile while the song plays)
#[tauri::command]
pub async fn scrobble_now_playing(token: String, meta: ListenMeta) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        post(&token, json!({ "listen_type": "playing_now", "payload": [{ "track_metadata": track_metadata(&meta) }] }))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// A finished listen (sent once the song has been heard long enough)
#[tauri::command]
pub async fn scrobble_listen(token: String, meta: ListenMeta) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let at = meta.listened_at.unwrap_or(0);
        post(
            &token,
            json!({ "listen_type": "single", "payload": [{ "listened_at": at, "track_metadata": track_metadata(&meta) }] }),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Checks the token (Settings → "Test")
#[tauri::command]
pub async fn scrobble_validate(token: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let t = token.trim().to_string();
        if t.is_empty() || t.len() > 100 || !t.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return Err("Invalid token".to_string());
        }
        let v: serde_json::Value = ureq::AgentBuilder::new()
            .timeout(Duration::from_secs(12))
            .build()
            .get(&format!("{}/validate-token", API))
            .set("Authorization", &format!("Token {}", t))
            .call()
            .map_err(|e| e.to_string())?
            .into_json()
            .map_err(|e| e.to_string())?;
        if v["valid"].as_bool() == Some(true) {
            Ok(v["user_name"].as_str().unwrap_or("").to_string())
        } else {
            Err("Invalid token".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
