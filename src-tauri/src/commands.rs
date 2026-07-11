//! フロントから呼ばれる Tauri コマンド。
//!
//! 戻り値の DTO には **秘匿値を一切含めない**（保存済みか否かの真偽フラグのみ）。
//! エラーは [`SwitchBotError`] としてシリアライズされ、安全な文言のみを載せる。

use serde::Serialize;

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
