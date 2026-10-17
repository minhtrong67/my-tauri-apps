use std::{thread, time::Duration};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // The main window starts hidden. The frontend shows it as soon as the saved
            // window preference (remembered size / maximized) has been applied, which
            // avoids a visible resize flash. This is only a safety net in case the
            // frontend never gets that far.
            if let Some(window) = app.get_webview_window("main") {
                thread::spawn(move || {
                    thread::sleep(Duration::from_millis(2500));
                    if !window.is_visible().unwrap_or(true) {
                        let _ = window.show();
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Material Calculator");
}
