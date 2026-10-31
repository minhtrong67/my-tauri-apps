use crate::model::{Entry, HiddenVerb, OsInfo, State, SystemItem};
use std::collections::{BTreeSet, HashMap};
use winreg::enums::*;
use winreg::RegKey;

const CLASSIC_CLSID: &str = r"Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}";
const BLOCKED: &str = r"Software\Microsoft\Windows\CurrentVersion\Shell Extensions\Blocked";
const PREFIX: &str = "MaterialMenu.";

/// Registry roots where the user's own commands may be written.
const FIXED_BASES: &[&str] = &[
    "*",
    "Directory",
    "Directory\\Background",
    "Drive",
    "DesktopBackground",
    "SystemFileAssociations\\image",
    "SystemFileAssociations\\video",
    "SystemFileAssociations\\audio",
    "SystemFileAssociations\\text",
];

/// Roots that are scanned for existing menu items.
const SCAN_BASES: &[(&str, &str)] = &[
    ("files", "*"),
    ("allobjects", "AllFilesystemObjects"),
    ("folders", "Directory"),
    ("folders", "Folder"),
    ("background", "Directory\\Background"),
    ("drives", "Drive"),
    ("desktop", "DesktopBackground"),
];

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ---------- classic menu ----------

pub fn is_classic() -> bool {
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(format!(r"{}\InprocServer32", CLASSIC_CLSID))
        .is_ok()
}

pub fn set_classic(on: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if on {
        let (k, _) = hkcu
            .create_subkey(format!(r"{}\InprocServer32", CLASSIC_CLSID))
            .map_err(err)?;
        k.set_value("", &"").map_err(err)?;
    } else if let Err(e) = hkcu.delete_subkey_all(CLASSIC_CLSID) {
        if e.kind() != std::io::ErrorKind::NotFound {
            return Err(err(e));
        }
    }
    Ok(())
}

// ---------- OS info ----------

pub fn os_info() -> OsInfo {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let mut info = OsInfo::default();
    if let Ok(k) = hklm.open_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion") {
        let build: String = k.get_value("CurrentBuild").unwrap_or_default();
        info.build = build.parse().unwrap_or(0);
        info.ubr = k.get_value("UBR").unwrap_or(0);
        info.display_version = k
            .get_value("DisplayVersion")
            .or_else(|_| k.get_value("ReleaseId"))
            .unwrap_or_default();
        let product: String = k.get_value("ProductName").unwrap_or_default();
        info.is_win11 = info.build >= 22000;
        info.name = if info.is_win11 {
            product.replace("Windows 10", "Windows 11")
        } else {
            product
        };
    }
    info
}

// ---------- custom entries ----------

fn norm_ext(e: &str) -> Option<String> {
    let t: String = e
        .trim()
        .trim_start_matches('.')
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();
    if t.is_empty() {
        None
    } else {
        Some(format!(".{}", t.to_lowercase()))
    }
}

fn entry_bases(e: &Entry) -> Vec<String> {
    let mut v = Vec::new();
    for s in &e.scopes {
        match s.as_str() {
            "files" => v.push("*".to_string()),
            "folders" => v.push("Directory".to_string()),
            "background" => v.push("Directory\\Background".to_string()),
            "drives" => v.push("Drive".to_string()),
            "desktop" => v.push("DesktopBackground".to_string()),
            "image" | "video" | "audio" | "text" => v.push(format!("SystemFileAssociations\\{}", s)),
            "ext" => {
                for x in &e.extensions {
                    if let Some(x) = norm_ext(x) {
                        v.push(format!("SystemFileAssociations\\{}", x));
                    }
                }
            }
            _ => {}
        }
    }
    v
}

fn slug(s: &str) -> String {
    let t: String = s
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .take(24)
        .collect();
    if t.is_empty() {
        "g".into()
    } else {
        t
    }
}

fn safe_id(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_alphanumeric()).take(16).collect()
}

fn write_verb(parent: &RegKey, key: &str, e: &Entry) -> Result<(), String> {
    let (k, _) = parent.create_subkey(key).map_err(err)?;
    k.set_value("MUIVerb", &e.label).map_err(err)?;
    if !e.icon.trim().is_empty() {
        k.set_value("Icon", &e.icon.trim().to_string()).map_err(err)?;
    }
    match e.position.as_str() {
        "top" => k.set_value("Position", &"Top").map_err(err)?,
        "bottom" => k.set_value("Position", &"Bottom").map_err(err)?,
        _ => {}
    }
    if e.shift_only {
        k.set_value("Extended", &"").map_err(err)?;
    }
    let mut flags: u32 = 0;
    if e.separator_before {
        flags |= 0x20;
    }
    if e.separator_after {
        flags |= 0x40;
    }
    if flags != 0 {
        k.set_value("CommandFlags", &flags).map_err(err)?;
    }
    let (c, _) = k.create_subkey("command").map_err(err)?;
    c.set_value("", &e.command).map_err(err)?;
    Ok(())
}

fn clean_base(hkcu: &RegKey, base: &str) {
    let path = format!(r"Software\Classes\{}\shell", base);
    if let Ok(shell) = hkcu.open_subkey_with_flags(&path, KEY_READ | KEY_WRITE) {
        let names: Vec<String> = shell
            .enum_keys()
            .filter_map(Result::ok)
            .filter(|n| n.starts_with(PREFIX))
            .collect();
        for n in names {
            let _ = shell.delete_subkey_all(&n);
        }
        let empty = shell.enum_keys().count() == 0 && shell.enum_values().count() == 0;
        drop(shell);
        if empty {
            let _ = hkcu.delete_subkey(&path);
        }
    }
}

pub fn apply_entries(old: &[Entry], new: &[Entry]) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let mut bases: BTreeSet<String> = FIXED_BASES.iter().map(|s| s.to_string()).collect();
    for e in old.iter().chain(new.iter()) {
        for b in entry_bases(e) {
            bases.insert(b);
        }
    }
    for b in &bases {
        clean_base(&hkcu, b);
    }
    for b in &bases {
        let list: Vec<(usize, &Entry)> = new
            .iter()
            .enumerate()
            .filter(|(_, e)| e.enabled && !e.label.trim().is_empty() && !e.command.trim().is_empty())
            .filter(|(_, e)| entry_bases(e).contains(b))
            .collect();
        if list.is_empty() {
            continue;
        }
        let (shell, _) = hkcu
            .create_subkey(format!(r"Software\Classes\{}\shell", b))
            .map_err(err)?;
        let mut groups: HashMap<String, RegKey> = HashMap::new();
        for (idx, e) in list {
            let id = safe_id(&e.id);
            let sub = e.submenu.trim();
            if sub.is_empty() {
                write_verb(&shell, &format!("{}{:03}_{}", PREFIX, idx, id), e)?;
            } else {
                let gkey = slug(sub);
                if !groups.contains_key(&gkey) {
                    let (g, _) = shell
                        .create_subkey(format!("{}{:03}_g_{}", PREFIX, idx, gkey))
                        .map_err(err)?;
                    g.set_value("MUIVerb", &sub.to_string()).map_err(err)?;
                    g.set_value("SubCommands", &"").map_err(err)?;
                    if !e.icon.trim().is_empty() {
                        g.set_value("Icon", &e.icon.trim().to_string()).map_err(err)?;
                    }
                    if e.position == "top" {
                        g.set_value("Position", &"Top").map_err(err)?;
                    } else if e.position == "bottom" {
                        g.set_value("Position", &"Bottom").map_err(err)?;
                    }
                    groups.insert(gkey.clone(), g);
                }
                let g = groups.get(&gkey).unwrap();
                let (children, _) = g.create_subkey("shell").map_err(err)?;
                write_verb(&children, &format!("{:03}_{}", idx, id), e)?;
            }
        }
    }
    Ok(())
}

// ---------- scanning existing items ----------

fn clean_display(s: &str) -> String {
    s.replace('&', "")
}

fn is_clsid(s: &str) -> bool {
    s.len() == 38 && s.starts_with('{') && s.ends_with('}')
}

fn blocked_set(root: winreg::HKEY) -> BTreeSet<String> {
    let mut set = BTreeSet::new();
    if let Ok(k) = RegKey::predef(root).open_subkey(BLOCKED) {
        for (name, _) in k.enum_values().filter_map(Result::ok) {
            set.insert(name.to_uppercase());
        }
    }
    set
}

pub fn scan(state: &State) -> Vec<SystemItem> {
    let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);
    let mut out: Vec<SystemItem> = Vec::new();

    // Static verbs
    for (scope, base) in SCAN_BASES {
        let Ok(shell) = hkcr.open_subkey(format!(r"{}\shell", base)) else {
            continue;
        };
        for name in shell.enum_keys().filter_map(Result::ok) {
            if name.starts_with(PREFIX) {
                continue;
            }
            let Ok(vk) = shell.open_subkey(&name) else {
                continue;
            };
            let ours = state
                .hidden_verbs
                .iter()
                .any(|h| h.base.eq_ignore_ascii_case(base) && h.name.eq_ignore_ascii_case(&name));
            let native_hidden = vk.get_value::<String, _>("ProgrammaticAccessOnly").is_ok()
                || vk.get_value::<String, _>("LegacyDisable").is_ok();
            if native_hidden && !ours {
                continue;
            }
            let mui: String = vk.get_value("MUIVerb").unwrap_or_default();
            let def: String = vk.get_value("").unwrap_or_default();
            let display = [mui, def]
                .into_iter()
                .find(|s| !s.is_empty() && !s.starts_with('@'))
                .map(|s| clean_display(&s))
                .unwrap_or_default();
            let command: String = vk
                .open_subkey("command")
                .and_then(|c| c.get_value::<String, _>(""))
                .unwrap_or_default();
            out.push(SystemItem {
                id: format!("v|{}|{}", base, name),
                kind: "verb".into(),
                base: base.to_string(),
                name,
                display,
                command,
                clsid: String::new(),
                hidden: ours,
                scopes: vec![scope.to_string()],
            });
        }
    }

    // Shell extension handlers (grouped by CLSID)
    let blocked_user = blocked_set(HKEY_CURRENT_USER);
    let blocked_machine = blocked_set(HKEY_LOCAL_MACHINE);
    let mut by_clsid: HashMap<String, usize> = HashMap::new();
    for (scope, base) in SCAN_BASES {
        let Ok(hk) = hkcr.open_subkey(format!(r"{}\shellex\ContextMenuHandlers", base)) else {
            continue;
        };
        for name in hk.enum_keys().filter_map(Result::ok) {
            let def: String = hk
                .open_subkey(&name)
                .and_then(|k| k.get_value::<String, _>(""))
                .unwrap_or_default();
            let clsid = if is_clsid(def.trim()) {
                def.trim().to_uppercase()
            } else if is_clsid(&name) {
                name.to_uppercase()
            } else {
                continue;
            };
            if blocked_machine.contains(&clsid) {
                continue;
            }
            if let Some(&i) = by_clsid.get(&clsid) {
                if !out[i].scopes.contains(&scope.to_string()) {
                    out[i].scopes.push(scope.to_string());
                }
                continue;
            }
            let friendly: String = hkcr
                .open_subkey(format!(r"CLSID\{}", clsid))
                .and_then(|k| k.get_value::<String, _>(""))
                .unwrap_or_default();
            let display = if !friendly.is_empty() && !friendly.starts_with('@') {
                clean_display(&friendly)
            } else if !is_clsid(&name) {
                name.clone()
            } else {
                String::new()
            };
            by_clsid.insert(clsid.clone(), out.len());
            out.push(SystemItem {
                id: format!("h|{}", clsid),
                kind: "handler".into(),
                base: base.to_string(),
                name,
                display,
                command: String::new(),
                hidden: blocked_user.contains(&clsid),
                clsid,
                scopes: vec![scope.to_string()],
            });
        }
    }
    out
}

pub fn set_verb_hidden(base: &str, name: &str, hidden: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = format!(r"Software\Classes\{}\shell\{}", base, name);
    if hidden {
        let (k, _) = hkcu.create_subkey(&path).map_err(err)?;
        k.set_value("LegacyDisable", &"").map_err(err)?;
        k.set_value("ProgrammaticAccessOnly", &"").map_err(err)?;
    } else if let Ok(k) = hkcu.open_subkey_with_flags(&path, KEY_READ | KEY_WRITE) {
        let _ = k.delete_value("LegacyDisable");
        let _ = k.delete_value("ProgrammaticAccessOnly");
        let empty = k.enum_keys().count() == 0 && k.enum_values().count() == 0;
        drop(k);
        if empty {
            let _ = hkcu.delete_subkey(&path);
        }
    }
    Ok(())
}

pub fn set_handler_blocked(clsid: &str, blocked: bool) -> Result<(), String> {
    if !is_clsid(clsid) {
        return Err("Invalid CLSID".into());
    }
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if blocked {
        let (k, _) = hkcu.create_subkey(BLOCKED).map_err(err)?;
        k.set_value(clsid, &"Blocked by Material Menu").map_err(err)?;
    } else if let Ok(k) = hkcu.open_subkey_with_flags(BLOCKED, KEY_READ | KEY_WRITE) {
        let _ = k.delete_value(clsid);
    }
    Ok(())
}

/// Removes everything the app created and returns to a clean state.
pub fn reset(state: &State) -> Result<(), String> {
    apply_entries(&state.entries, &[])?;
    for h in &state.hidden_verbs {
        let _ = set_verb_hidden(&h.base, &h.name, false);
    }
    for c in &state.blocked_clsids {
        let _ = set_handler_blocked(c, false);
    }
    set_classic(false)
}

pub fn hidden_verb(base: &str, name: &str) -> HiddenVerb {
    HiddenVerb { base: base.into(), name: name.into() }
}
