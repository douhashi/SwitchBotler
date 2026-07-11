// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod switchbot;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_positioner::{Position, WindowExt};

use commands::show_main;

/// トレイアイコン（アプリ既定アイコン）とネイティブメニューを構築する。
///
/// 左クリック → positioner で tray 近傍に配置し tray ウィンドウを表示（決定1: WebView ポップアップ）。
/// 右クリック → ネイティブメニュー（ウィンドウを開く / 設定 / 終了）を表示。
/// ポップアップが出せない詰みを避けるフェイルセーフとして「終了」をメニューにも置く。
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let open_i = MenuItem::with_id(app, "open", "ウィンドウを開く", true, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", "設定", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_i, &settings_i, &quit_i])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("SwitchBotler")
        .menu(&menu)
        // 左クリックはポップアップ表示に使うため、メニューは右クリックのみ。
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app, None),
            "settings" => show_main(app, Some("settings")),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();
            // tray 相対位置を機能させるため、必ず positioner に渡す（V3）。
            tauri_plugin_positioner::on_tray_event(app, &event);
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_tray_popup(app);
            }
        })
        .build(app)?;
    Ok(())
}

/// トレイのポップアップウィンドウを開閉する。開くときは tray 近傍へ配置する。
fn toggle_tray_popup(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("tray") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            // 表示前に位置を確定させてちらつきを防ぐ。
            let _ = window.move_window(Position::TrayCenter);
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance は最初に登録する（公式推奨）。2 重起動時は既存 main を前面化。
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app, None);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // メインウィンドウの × は終了せずトレイに常駐（close-to-tray）。
            // hide の実行とタイミング（初回のみ AlertDialog で案内してから hide）は
            // フロント側（onCloseRequested）が担う。ここでは実クローズを止めるだけの
            // フェイルセーフに徹し、フロント未処理でもアプリが終了しないようにする（決定3）。
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_credentials,
            commands::test_connection,
            commands::disconnect,
            commands::get_connection_state,
            commands::list_devices,
            commands::send_command,
            commands::send_aircon,
            commands::list_scenes,
            commands::execute_scene,
            commands::get_sensors,
            commands::quit,
            commands::show_main_window,
            commands::hide_tray_popup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
