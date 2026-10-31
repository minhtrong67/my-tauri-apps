use std::os::windows::process::CommandExt;
use std::process::Command;
use std::thread::sleep;
use std::time::Duration;

const NO_WINDOW: u32 = 0x0800_0000;

fn hidden(program: &str) -> Command {
    let mut c = Command::new(program);
    c.creation_flags(NO_WINDOW);
    c
}

fn explorer_running() -> bool {
    hidden("tasklist")
        .args(["/FI", "IMAGENAME eq explorer.exe", "/NH"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_lowercase().contains("explorer.exe"))
        .unwrap_or(false)
}

pub fn restart_explorer() -> Result<(), String> {
    hidden("taskkill")
        .args(["/F", "/IM", "explorer.exe"])
        .status()
        .map_err(|e| e.to_string())?;
    for _ in 0..8 {
        sleep(Duration::from_millis(400));
        if explorer_running() {
            return Ok(());
        }
    }
    // Windows normally relaunches the shell on its own; start it if it did not.
    Command::new("explorer.exe").spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Opens an https/http URL or an ms-settings: URI with the default handler.
pub fn open_uri(uri: &str) -> Result<(), String> {
    let ok = uri.starts_with("https://") || uri.starts_with("http://") || uri.starts_with("ms-settings:");
    if !ok || uri.contains('"') {
        return Err("Unsupported URI".into());
    }
    hidden("rundll32")
        .args(["url.dll,FileProtocolHandler", uri])
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn open_path(path: &str) -> Result<(), String> {
    Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
