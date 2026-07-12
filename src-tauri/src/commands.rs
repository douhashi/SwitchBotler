//! フロントから呼ばれる Tauri コマンド。
//!
//! 戻り値の DTO には **秘匿値を一切含めない**（保存済みか否かの真偽フラグのみ）。
//! エラーは [`SwitchBotError`] としてシリアライズされ、安全な文言のみを載せる。

use serde::Serialize;
use tauri::menu::MenuItem;
use tauri::{AppHandle, Emitter, Manager, State, Wry};

use crate::switchbot::mapping::{DeviceDto, SceneDto, SensorReadingsDto};
use crate::switchbot::{credentials, SwitchBotClient, SwitchBotError};

/// フロントに返す接続状態 DTO。秘匿値を持たない。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStateDto {
    /// keyring に Token / Secret が保存されているか。
    pub saved: bool,
}

impl ConnectionStateDto {
    fn current() -> Self {
        Self {
            saved: credentials::has_credentials(),
        }
    }
}

/// Token / Secret を keyring に保存する（疎通確認は行わない）。
#[tauri::command]
pub fn save_credentials(token: String, secret: String) -> Result<(), SwitchBotError> {
    credentials::save(&token, &secret)
}

/// 保存済み認証情報で `GET /v1.1/devices` を叩き疎通を確認する。
/// 成功 = HTTP 200 かつ封筒 statusCode 100。
#[tauri::command]
pub async fn test_connection() -> Result<ConnectionStateDto, SwitchBotError> {
    let creds = credentials::load()?;
    let client = SwitchBotClient::new()?;
    client.get_devices(&creds).await?;
    Ok(ConnectionStateDto::current())
}

/// keyring から認証情報を削除する。
#[tauri::command]
pub fn disconnect() -> Result<(), SwitchBotError> {
    credentials::delete()
}

/// 現在の接続状態（保存済みか否か）を返す。
#[tauri::command]
pub fn get_connection_state() -> ConnectionStateDto {
    ConnectionStateDto::current()
}

/// 保存済み認証情報で新しいクライアントを用意する（各データコマンド共通の前処理）。
fn client_with_creds() -> Result<(SwitchBotClient, credentials::Credentials), SwitchBotError> {
    let creds = credentials::load()?;
    let client = SwitchBotClient::new()?;
    Ok((client, creds))
}

/// デバイス一覧（対応種別は状態込み）を view-model DTO で返す。
#[tauri::command]
pub async fn list_devices() -> Result<Vec<DeviceDto>, SwitchBotError> {
    let (client, creds) = client_with_creds()?;
    client.list_devices(&creds).await
}

/// デバイスへコマンドを送信する（turnOn/turnOff/setBrightness/setPosition/lock/unlock/setColor 等）。
/// setColor の parameter は preset id で受け取り、Rust 側で "R:G:B" へ変換する（決定2）。
#[tauri::command]
pub async fn send_command(
    id: String,
    command: String,
    parameter: String,
    command_type: String,
) -> Result<(), SwitchBotError> {
    let (client, creds) = client_with_creds()?;
    client
        .send_command(&creds, &id, &command, &parameter, &command_type)
        .await
}

/// 赤外線エアコンに setAll（温度・モード・風量・電源を一括送信）する。
/// フロントは意味論（mode="cool" / fanSpeed="high"）だけを渡し、setAll の数値エンコードは
/// Rust `mapping.rs` が所有する（決定1）。
#[tauri::command]
pub async fn send_aircon(
    id: String,
    temperature: u8,
    mode: String,
    fan_speed: String,
    power: bool,
) -> Result<(), SwitchBotError> {
    let (client, creds) = client_with_creds()?;
    client
        .send_aircon(&creds, &id, temperature, &mode, &fan_speed, power)
        .await
}

/// 赤外線ライトに電源・相対明暗コマンドを送る（Light / DIY Light）。
/// フロントは action（"on"/"off"/"brighter"/"dimmer"）だけを渡し、SwitchBot コマンド名への
/// 変換は Rust `mapping.rs`（`ir_light_command`）が所有する。Light は状態を返さない。
#[tauri::command]
pub async fn send_ir_light(id: String, action: String) -> Result<(), SwitchBotError> {
    let (client, creds) = client_with_creds()?;
    client.send_ir_light(&creds, &id, &action).await
}

/// シーン一覧を view-model DTO で返す。
#[tauri::command]
pub async fn list_scenes() -> Result<Vec<SceneDto>, SwitchBotError> {
    let (client, creds) = client_with_creds()?;
    client.list_scenes(&creds).await
}

/// シーンを実行する。
#[tauri::command]
pub async fn execute_scene(id: String) -> Result<(), SwitchBotError> {
    let (client, creds) = client_with_creds()?;
    client.execute_scene(&creds, &id).await
}

/// すべての Meter のセンサー読み取りをセンサーごとに返す（履歴なし。決定3）。
#[tauri::command]
pub async fn get_sensors() -> Result<Vec<SensorReadingsDto>, SwitchBotError> {
    let (client, creds) = client_with_creds()?;
    client.get_sensors(&creds).await
}

/// アプリを終了する（トレイ「終了」用のフェイルセーフ経路。決定1）。
#[tauri::command]
pub fn quit(app: AppHandle) {
    app.exit(0);
}

/// "navigate" イベントの payload。表示する画面（view）を伝える。
#[derive(Debug, Clone, Serialize)]
struct NavigatePayload {
    view: String,
}

/// メインウィンドウを表示・前面化し、必要なら画面遷移イベントを emit する。
/// `view` があれば "navigate"、表示時は常に "main-shown" を emit する
/// （フロントは navigate で画面遷移、main-shown で device-store を reload。決定4）。
/// トレイメニュー / single-instance / フロント invoke の共通実装（SSoT）。
pub fn show_main(app: &AppHandle, view: Option<&str>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        if let Some(view) = view {
            let payload = NavigatePayload {
                view: view.to_string(),
            };
            let _ = app.emit_to("main", "navigate", payload);
        }
        let _ = app.emit_to("main", "main-shown", ());
    }
}

/// フロント（トレイポップアップのフッタ）からメインウィンドウを開くコマンド。
#[tauri::command]
pub fn show_main_window(app: AppHandle, view: Option<String>) {
    show_main(&app, view.as_deref());
}

/// トレイのポップアップウィンドウを隠す。
#[tauri::command]
pub fn hide_tray_popup(app: AppHandle) {
    if let Some(window) = app.get_webview_window("tray") {
        let _ = window.hide();
    }
}

/// `setup_tray` で構築した native トレイメニュー項目のハンドル。
/// managed state として保持し、`set_tray_menu_labels` から実行時にラベルを更新する。
pub struct TrayMenuItems {
    pub open: MenuItem<Wry>,
    pub settings: MenuItem<Wry>,
    pub quit: MenuItem<Wry>,
}

/// native 右クリックトレイメニューのラベルを更新する。
///
/// 翻訳の SSoT はフロントの i18n JSON。Rust は翻訳表を持たず、フロントが解決した
/// 翻訳済み文字列を受け取り `MenuItem::set_text` で反映するだけ（同一ラベルで冪等）。
#[tauri::command]
pub fn set_tray_menu_labels(
    state: State<'_, TrayMenuItems>,
    open_window: String,
    settings: String,
    quit: String,
) -> Result<(), String> {
    state
        .open
        .set_text(open_window)
        .map_err(|e| e.to_string())?;
    state
        .settings
        .set_text(settings)
        .map_err(|e| e.to_string())?;
    state.quit.set_text(quit).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `navigate` イベント payload は `{ view }` として emit される（フロント契約）。
    #[test]
    fn navigate_payload_serializes_view() {
        let payload = NavigatePayload {
            view: "settings".into(),
        };
        let json = serde_json::to_value(&payload).unwrap();
        assert_eq!(json["view"], "settings");
    }
}
