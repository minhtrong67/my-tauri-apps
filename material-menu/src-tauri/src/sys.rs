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

pub fn exe_of(cmd: &str) -> String {
    let c = cmd.trim();
    if let Some(r) = c.strip_prefix('"') {
        r.split('"').next().unwrap_or("").to_string()
    } else {
        c.split_whitespace().next().unwrap_or("").to_string()
    }
}

fn expand_env(s: &str) -> String {
    let mut out = String::new();
    let mut rest = s;
    while let Some(i) = rest.find('%') {
        out.push_str(&rest[..i]);
        let tail = &rest[i + 1..];
        match tail.find('%') {
            Some(j) => {
                let name = &tail[..j];
                match std::env::var(name) {
                    Ok(v) if !name.is_empty() => out.push_str(&v),
                    _ => {
                        out.push('%');
                        out.push_str(name);
                        out.push('%');
                    }
                }
                rest = &tail[j + 1..];
            }
            None => {
                out.push('%');
                rest = tail;
                break;
            }
        }
    }
    out.push_str(rest);
    out
}

pub fn command_exists(cmd: &str) -> bool {
    let exe = expand_env(&exe_of(cmd));
    if exe.is_empty() {
        return false;
    }
    if exe.contains('\\') || exe.contains('/') {
        return std::path::Path::new(&exe).exists();
    }
    let mut dirs: Vec<std::path::PathBuf> = std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).collect())
        .unwrap_or_default();
    if let Ok(root) = std::env::var("SystemRoot") {
        dirs.push(std::path::PathBuf::from(root).join("System32"));
    }
    for d in dirs {
        for ext in ["", ".exe", ".cmd", ".bat", ".com"] {
            if d.join(format!("{}{}", exe, ext)).is_file() {
                return true;
            }
        }
    }
    false
}

/// Runs the command once with %1 / %V replaced by the user's profile folder.
pub fn test_command(cmd: &str) -> Result<(), String> {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".into());
    let line = cmd.replace("%1", &home).replace("%V", &home).replace("%v", &home);
    Command::new("cmd")
        .creation_flags(NO_WINDOW)
        .raw_arg(format!("/C start \"\" {}", line))
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Extracts icons for the given files (exe / dll / ico) as PNG data URLs using one hidden PowerShell call.
pub fn get_icons(paths: &[String]) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let list: Vec<&String> = paths.iter().filter(|p| !p.contains('\n') && !p.is_empty()).take(80).collect();
    if list.is_empty() {
        return map;
    }
    let joined = list.iter().map(|s| s.as_str()).collect::<Vec<_>>().join("\n");
    let script = "$ErrorActionPreference='SilentlyContinue'; Add-Type -AssemblyName System.Drawing; \
foreach($p in ($env:MM_PATHS -split \"`n\")){ if(-not $p){continue}; $f=[Environment]::ExpandEnvironmentVariables($p); \
if(Test-Path -LiteralPath $f){ $i=[System.Drawing.Icon]::ExtractAssociatedIcon($f); if($i){ $m=New-Object System.IO.MemoryStream; \
$i.ToBitmap().Save($m,[System.Drawing.Imaging.ImageFormat]::Png); Write-Output ($p + '|' + [Convert]::ToBase64String($m.ToArray())) } } }";
    let out = hidden("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .env("MM_PATHS", joined)
        .output();
    if let Ok(o) = out {
        for line in String::from_utf8_lossy(&o.stdout).lines() {
            if let Some((p, b)) = line.rsplit_once('|') {
                map.insert(p.to_string(), format!("data:image/png;base64,{}", b.trim()));
            }
        }
    }
    map
}
