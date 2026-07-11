// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod switchbot;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::save_credentials,
            commands::test_connection,
            commands::disconnect,
            commands::get_connection_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
