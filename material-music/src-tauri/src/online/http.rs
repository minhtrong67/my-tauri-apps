//! Small HTTP helpers shared by the online code.
use serde_json::Value;
use std::io::Read;
use std::time::Duration;

pub const UA: &str = concat!("Material Music/", env!("CARGO_PKG_VERSION"), " (+https://github.com/minhtrong67/my-tauri-apps)");
/// Metadata answers are small; anything bigger is a mistake (or an attack) and is cut off
const MAX_JSON: u64 = 6 * 1024 * 1024;

pub fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(6))
        .timeout(Duration::from_secs(15))
        .user_agent(UA)
        .build()
}

pub fn map_err(e: ureq::Error) -> String {
    match e {
        ureq::Error::Status(code, _) => format!("E_HTTP: {code}"),
        ureq::Error::Transport(t) => format!("E_NETWORK: {t}"),
    }
}

/// POST a JSON body and read a JSON answer (size capped)
pub fn post_json(agent: &ureq::Agent, url: &str, headers: &[(&str, &str)], body: &Value) -> Result<Value, String> {
    let mut req = agent.post(url);
    for (k, v) in headers {
        req = req.set(k, v);
    }
    let resp = req.send_json(body.clone()).map_err(map_err)?;
    let mut buf = Vec::new();
    resp.into_reader().take(MAX_JSON).read_to_end(&mut buf).map_err(|e| format!("E_NETWORK: {e}"))?;
    serde_json::from_slice(&buf).map_err(|e| format!("E_BAD_RESPONSE: {e}"))
}
