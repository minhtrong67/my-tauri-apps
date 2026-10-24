use std::path::PathBuf;
use std::sync::Arc;

use tauri::State;

use crate::manager::Manager;
use crate::models::*;
use crate::{analyze, util, ytdlp};

type M<'a> = State<'a, Arc<Manager>>;

#[tauri::command]
pub fn get_settings(m: M<'_>) -> Settings {
    m.settings()
}

#[tauri::command]
pub fn save_settings(m: M<'_>, settings: Settings) {
    m.inner().save_settings(settings);
}

#[tauri::command]
pub fn default_download_dir(m: M<'_>) -> String {
    m.default_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub async fn analyze_url(
    m: M<'_>,
    url: String,
    title: Option<String>,
    referer: Option<String>,
    user_agent: Option<String>,
    cookie: Option<String>,
) -> Result<MediaInfo, String> {
    let m = m.inner().clone();
    analyze::analyze(&m, &url, title, referer, user_agent, cookie).await
}

#[tauri::command]
pub fn add_download(m: M<'_>, req: AddRequest) -> Result<Download, String> {
    m.inner().add(req)
}

#[tauri::command]
pub fn list_downloads(m: M<'_>) -> Vec<Download> {
    m.list()
}

#[tauri::command]
pub fn pause_download(m: M<'_>, id: String) {
    m.pause(&id);
}

#[tauri::command]
pub fn resume_download(m: M<'_>, id: String) {
    m.inner().resume(&id);
}

#[tauri::command]
pub fn remove_download(m: M<'_>, id: String, delete_file: bool) {
    m.inner().remove(&id, delete_file);
}

#[tauri::command]
pub fn pause_all(m: M<'_>) {
    m.pause_all();
}

#[tauri::command]
pub fn resume_all(m: M<'_>) {
    m.inner().resume_all();
}

#[tauri::command]
pub fn clear_finished(m: M<'_>) {
    m.inner().clear_finished();
}

#[tauri::command]
pub fn open_download(m: M<'_>, id: String) -> Result<(), String> {
    let d = m.get(&id).ok_or("Download not found")?;
    let path = d.path.ok_or("The file is not ready yet")?;
    let p = PathBuf::from(path);
    if !p.exists() {
        return Err("FILE_MISSING".into());
    }
    util::open_path(&p)
}

#[tauri::command]
pub fn reveal_download(m: M<'_>, id: String) -> Result<(), String> {
    let d = m.get(&id).ok_or("Download not found")?;
    let target = match d.path {
        Some(p) if PathBuf::from(&p).exists() => PathBuf::from(p),
        _ => PathBuf::from(&d.dir),
    };
    util::reveal_path(&target)
}

#[tauri::command]
pub fn open_folder(m: M<'_>, path: Option<String>) -> Result<(), String> {
    let dir = match path.filter(|p| !p.trim().is_empty()) {
        Some(p) => PathBuf::from(p),
        None => m.download_dir(),
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    util::open_path(&dir)
}

#[tauri::command]
pub async fn engine_status(m: M<'_>) -> Result<EngineStatus, String> {
    let m = m.inner().clone();
    Ok(ytdlp::engine_status(&m).await)
}

#[tauri::command]
pub async fn install_ytdlp(m: M<'_>) -> Result<EngineStatus, String> {
    let m = m.inner().clone();
    ytdlp::install_ytdlp(&m).await?;
    Ok(ytdlp::engine_status(&m).await)
}

#[tauri::command]
pub async fn install_ffmpeg(m: M<'_>) -> Result<EngineStatus, String> {
    let m = m.inner().clone();
    ytdlp::install_ffmpeg(&m).await?;
    Ok(ytdlp::engine_status(&m).await)
}

#[tauri::command]
pub fn server_info(m: M<'_>) -> ServerInfo {
    let port = *m.server_port.lock().unwrap_or_else(|e| e.into_inner());
    ServerInfo { port: port.unwrap_or(crate::server::FIRST_PORT), running: port.is_some() }
}
