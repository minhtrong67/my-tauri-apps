//! Tiny localhost HTTP server used by the browser extension to hand links to the app.

use std::io::Read;
use std::sync::Arc;

use serde_json::{json, Value};
use tauri::{Emitter, Manager as _};
use tiny_http::{Header, Method, Request, Response, Server};

use crate::manager::Manager;
use crate::models::Status;

pub const FIRST_PORT: u16 = 38517;
pub const LAST_PORT: u16 = 38527;

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("valid header")
}

fn is_extension_origin(origin: &str) -> bool {
    origin.starts_with("chrome-extension://")
        || origin.starts_with("moz-extension://")
        || origin.starts_with("safari-web-extension://")
}

fn respond(req: Request, status: u16, body: Value, origin: Option<&str>) {
    let mut res = Response::from_string(body.to_string())
        .with_status_code(status)
        .with_header(header("Content-Type", "application/json; charset=utf-8"))
        .with_header(header("Cache-Control", "no-store"));
    if let Some(o) = origin.filter(|o| is_extension_origin(o)) {
        res = res
            .with_header(header("Access-Control-Allow-Origin", o))
            .with_header(header("Access-Control-Allow-Headers", "content-type, x-mvd-client"))
            .with_header(header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"))
            .with_header(header("Access-Control-Allow-Private-Network", "true"))
            .with_header(header("Vary", "Origin"));
    }
    let _ = req.respond(res);
}

fn handle(m: &Arc<Manager>, mut req: Request) {
    let origin = req
        .headers()
        .iter()
        .find(|h| h.field.equiv("Origin"))
        .map(|h| h.value.as_str().to_string());
    let path = req.url().split('?').next().unwrap_or("/").to_string();
    let method = req.method().clone();

    if method == Method::Options {
        return respond(req, 204, json!({}), origin.as_deref());
    }
    if !m.settings().extension_server {
        return respond(req, 403, json!({ "ok": false, "error": "disabled" }), origin.as_deref());
    }

    match (method, path.as_str()) {
        (Method::Get, "/ping") => respond(
            req,
            200,
            json!({ "ok": true, "app": "material-video-downloader", "version": env!("CARGO_PKG_VERSION") }),
            origin.as_deref(),
        ),
        (Method::Get, "/status") => {
            let list = m.list();
            let active = list.iter().filter(|d| matches!(d.status, Status::Downloading | Status::Merging)).count();
            let speed: f64 = list.iter().filter(|d| d.status == Status::Downloading).map(|d| d.speed).sum();
            let items: Vec<Value> = list
                .iter()
                .take(6)
                .map(|d| json!({ "id": d.id, "title": d.title, "status": d.status, "progress": d.progress, "speed": d.speed }))
                .collect();
            respond(
                req,
                200,
                json!({ "ok": true, "active": active, "speed": speed, "items": items }),
                origin.as_deref(),
            )
        }
        (Method::Post, "/add") => {
            // Browsers always send Origin for cross-site POSTs: only extensions may add links.
            if let Some(o) = origin.as_deref() {
                if !is_extension_origin(o) {
                    return respond(req, 403, json!({ "ok": false, "error": "forbidden" }), None);
                }
            }
            let mut body = String::new();
            let _ = req.as_reader().take(256 * 1024).read_to_string(&mut body);
            let value: Value = match serde_json::from_str(&body) {
                Ok(v) => v,
                Err(_) => return respond(req, 400, json!({ "ok": false, "error": "bad json" }), origin.as_deref()),
            };
            let url_ok = value
                .get("url")
                .and_then(|u| u.as_str())
                .map(|u| u.starts_with("http://") || u.starts_with("https://"))
                .unwrap_or(false);
            if !url_ok {
                return respond(req, 400, json!({ "ok": false, "error": "invalid url" }), origin.as_deref());
            }
            let _ = m.app.emit("extension-add", value);
            if let Some(w) = m.app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            respond(req, 200, json!({ "ok": true }), origin.as_deref())
        }
        _ => respond(req, 404, json!({ "ok": false, "error": "not found" }), origin.as_deref()),
    }
}

pub fn start(m: Arc<Manager>) {
    std::thread::spawn(move || {
        let mut found = None;
        for port in FIRST_PORT..=LAST_PORT {
            if let Ok(server) = Server::http(("127.0.0.1", port)) {
                found = Some((server, port));
                break;
            }
        }
        let Some((server, port)) = found else { return };
        *m.server_port.lock().unwrap_or_else(|e| e.into_inner()) = Some(port);
        for req in server.incoming_requests() {
            handle(&m, req);
        }
    });
}
