//! SwitchBot 連携のエラー型。
//!
//! **秘匿値（token / secret / 署名）を一切含めない**。Display / Serialize とも
//! 安全な文言（利用者向け日本語メッセージ）のみを出す。フロントへはこの型が
//! `{ code, message }` としてシリアライズされて渡る。

use std::fmt;

use serde::Serialize;

/// エラー種別。フロント側での分岐に使える安定コード。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ErrorCode {
    /// 認証失敗（HTTP 401）。公式に残数フィールドが無いため、
    /// リクエスト上限超過も 401 になり得る（両可能性を文言で示す）。
    Unauthorized,
    /// リクエスト過多（HTTP 429）。
    RateLimited,
    /// API 封筒の statusCode が 100 以外。
    ApiStatus,
    /// 通信・レスポンス解析の失敗。
    Network,
    /// セキュアストレージ（keyring）へのアクセス失敗。
    Storage,
    /// 認証情報が未保存。
    MissingCredentials,
}

/// フロント / ログへ渡して安全なエラー。秘匿値を保持しない。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchBotError {
    pub code: ErrorCode,
    /// 利用者向けの安全な日本語メッセージ。
    pub message: String,
}

impl SwitchBotError {
    fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn unauthorized() -> Self {
        Self::new(
            ErrorCode::Unauthorized,
            "認証情報またはリクエスト上限を確認してください。",
        )
    }

    pub fn rate_limited() -> Self {
        Self::new(
            ErrorCode::RateLimited,
            "リクエストが多すぎます。しばらく待って再試行してください。",
        )
    }

    /// API 封筒の statusCode 異常。数値コードのみ含める（秘匿値は含めない）。
    pub fn api_status(status_code: i64) -> Self {
        Self::new(
            ErrorCode::ApiStatus,
            format!("SwitchBot API がエラーを返しました（コード {status_code}）。"),
        )
    }

    pub fn network() -> Self {
        Self::new(
            ErrorCode::Network,
            "SwitchBot API に接続できませんでした。ネットワーク接続を確認してください。",
        )
    }

    pub fn storage() -> Self {
        Self::new(
            ErrorCode::Storage,
            "認証情報の保存領域にアクセスできませんでした。",
        )
    }

    pub fn missing_credentials() -> Self {
        Self::new(
            ErrorCode::MissingCredentials,
            "認証情報が保存されていません。",
        )
    }
}

impl fmt::Display for SwitchBotError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // 安全なメッセージのみ。秘匿値は含まれない。
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for SwitchBotError {}
