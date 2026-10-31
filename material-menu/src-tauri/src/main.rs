#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(windows))]
compile_error!("Material Menu only supports Windows 10/11.");

mod commands;
mod model;
mod registry;
mod store;
mod sys;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            if let Some(win) = app.get_webview_window("main") {
                store::apply_window_settings(&handle, &win);
                let h = handle.clone();
                let w = win.clone();
                win.on_window_event(move |ev| {
                    if let tauri::WindowEvent::CloseRequested { .. } = ev {
                        store::remember_window(&h, &w);
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_ready,
            commands::load_settings,
            commands::save_settings,
            commands::default_save_dir,
            commands::get_state,
            commands::get_os_info,
            commands::set_classic_menu,
            commands::save_entries,
            commands::scan_system_items,
            commands::set_item_hidden,
            commands::restart_explorer,
            commands::open_uri,
            commands::open_path,
            commands::write_backup,
            commands::read_text,
            commands::list_backups,
            commands::delete_backup,
            commands::restore_state,
            commands::reset_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Menu");
}
