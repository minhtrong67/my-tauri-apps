use serde::{Deserialize, Serialize};

fn yes() -> bool {
    true
}
fn pos() -> String {
    "default".into()
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub label: String,
    pub command: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub scopes: Vec<String>,
    #[serde(default)]
    pub extensions: Vec<String>,
    #[serde(default)]
    pub submenu: String,
    #[serde(default = "pos")]
    pub position: String,
    #[serde(default)]
    pub shift_only: bool,
    #[serde(default)]
    pub separator_before: bool,
    #[serde(default)]
    pub separator_after: bool,
    #[serde(default = "yes")]
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct HiddenVerb {
    pub base: String,
    pub name: String,
}

/// Everything the app itself owns (persisted in state.json).
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct State {
    #[serde(default)]
    pub entries: Vec<Entry>,
    #[serde(default)]
    pub hidden_verbs: Vec<HiddenVerb>,
    #[serde(default)]
    pub blocked_clsids: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct FullState {
    #[serde(flatten)]
    pub state: State,
    #[serde(default)]
    pub classic: bool,
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct SystemItem {
    pub id: String,
    pub kind: String, // "verb" | "handler"
    pub base: String,
    pub name: String,
    pub display: String,
    pub command: String,
    pub clsid: String,
    pub hidden: bool,
    pub scopes: Vec<String>,
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct OsInfo {
    pub name: String,
    pub build: u32,
    pub ubr: u32,
    pub display_version: String,
    pub is_win11: bool,
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: u64,
}
