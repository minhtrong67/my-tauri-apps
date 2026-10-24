use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub download_dir: String,
    pub max_concurrent: u32,
    pub connections: u32,
    pub speed_limit_kb: u64,
    pub ask_quality: bool,
    pub auto_start: bool,
    pub clipboard_watch: bool,
    pub notifications: bool,
    pub extension_server: bool,
    pub cookies_browser: String,
    pub window_mode: String,
    pub ytdlp_path: String,
    pub ffmpeg_path: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            download_dir: String::new(),
            max_concurrent: 3,
            connections: 8,
            speed_limit_kb: 0,
            ask_quality: true,
            auto_start: true,
            clipboard_watch: true,
            notifications: true,
            extension_server: true,
            cookies_browser: "none".into(),
            window_mode: "remember".into(),
            ytdlp_path: String::new(),
            ffmpeg_path: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Queued,
    Downloading,
    Paused,
    Merging,
    Completed,
    Failed,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Direct,
    Hls,
    Ytdlp,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Seg {
    pub start: u64,
    pub end: u64,
    pub done: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase", default)]
pub struct Download {
    pub id: String,
    pub url: String,
    pub kind: Kind,
    pub title: String,
    pub thumbnail: Option<String>,
    pub site: String,
    pub filename: String,
    pub dir: String,
    pub path: Option<String>,
    pub status: Status,
    pub progress: f64,
    pub downloaded: u64,
    pub total: u64,
    pub speed: f64,
    pub eta: Option<u64>,
    pub error: Option<String>,
    pub quality: String,
    pub selector: String,
    pub audio_only: bool,
    pub audio_format: String,
    pub referer: Option<String>,
    pub user_agent: Option<String>,
    pub cookie: Option<String>,
    pub duration: Option<f64>,
    pub segments: Vec<Seg>,
    pub created_at: u64,
    pub completed_at: Option<u64>,
}

impl Default for Download {
    fn default() -> Self {
        Self {
            id: String::new(),
            url: String::new(),
            kind: Kind::Direct,
            title: String::new(),
            thumbnail: None,
            site: String::new(),
            filename: String::new(),
            dir: String::new(),
            path: None,
            status: Status::Queued,
            progress: 0.0,
            downloaded: 0,
            total: 0,
            speed: 0.0,
            eta: None,
            error: None,
            quality: String::new(),
            selector: String::new(),
            audio_only: false,
            audio_format: String::new(),
            referer: None,
            user_agent: None,
            cookie: None,
            duration: None,
            segments: Vec::new(),
            created_at: 0,
            completed_at: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct QualityOption {
    pub id: String,
    pub label: String,
    pub detail: String,
    pub selector: String,
    pub audio_only: bool,
    pub audio_format: String,
    pub height: u32,
    pub size: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub kind: Kind,
    pub url: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub site: String,
    pub duration: Option<f64>,
    pub uploader: Option<String>,
    pub filename: String,
    pub size: Option<u64>,
    pub options: Vec<QualityOption>,
    pub referer: Option<String>,
    pub user_agent: Option<String>,
    pub cookie: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct AddRequest {
    pub url: String,
    pub kind: Option<Kind>,
    pub title: String,
    pub thumbnail: Option<String>,
    pub site: String,
    pub filename: String,
    pub size: Option<u64>,
    pub duration: Option<f64>,
    pub quality: String,
    pub selector: String,
    pub audio_only: bool,
    pub audio_format: String,
    pub referer: Option<String>,
    pub user_agent: Option<String>,
    pub cookie: Option<String>,
    pub dir: Option<String>,
    pub start: Option<bool>,
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct EngineTool {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub managed: bool,
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub ytdlp: EngineTool,
    pub ffmpeg: EngineTool,
    pub can_install_ffmpeg: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EngineProgress {
    pub name: String,
    pub downloaded: u64,
    pub total: u64,
    pub done: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub port: u16,
    pub running: bool,
}

#[derive(Debug)]
pub enum Stop {
    Paused,
    Canceled,
    Failed(String),
}

impl<E: std::fmt::Display> From<E> for Stop {
    fn from(e: E) -> Self {
        Stop::Failed(e.to_string())
    }
}
