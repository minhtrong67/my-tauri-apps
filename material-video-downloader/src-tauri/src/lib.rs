mod analyze;
mod commands;
mod direct;
mod hls;
mod manager;
mod models;
mod server;
mod util;
mod window;
mod ytdlp;

use tauri::Manager as _;

fn focus_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| focus_main(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let data_dir = app.path().app_data_dir()?;
            let manager = manager::Manager::new(handle.clone(), data_dir);
            app.manage(manager.clone());
            window::apply_startup(&handle, &manager.settings().window_mode);
            server::start(manager);
            Ok(())
        })
        .on_window_event(window::on_event)
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::default_download_dir,
            commands::analyze_url,
            commands::add_download,
            commands::list_downloads,
            commands::pause_download,
            commands::resume_download,
            commands::remove_download,
            commands::pause_all,
            commands::resume_all,
            commands::clear_finished,
            commands::open_download,
            commands::reveal_download,
            commands::open_folder,
            commands::engine_status,
            commands::install_ytdlp,
            commands::install_ffmpeg,
            commands::server_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Video Downloader");
}
