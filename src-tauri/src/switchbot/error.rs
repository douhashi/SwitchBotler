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
    /// デバイスがオフライン（API 封筒の statusCode 161）。操作を受け付けられない。
    Offline,
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
    /// 診断ログ用の安全なメッセージ（秘匿値なし）。利用者向け表示はフロントが `code` から翻訳する。
    pub message: String,
    /// API 封筒の statusCode（`apiStatus` のみ設定）。フロントが `errors.apiStatus` で補間する。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_code: Option<i64>,
}

impl SwitchBotError {
    fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            status_code: None,
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

    /// API 封筒の statusCode 異常。番号は構造化フィールドで保持し、フロントが補間表示する。
    pub fn api_status(status_code: i64) -> Self {
        Self {
            code: ErrorCode::ApiStatus,
            // 診断ログ用（利用者向け表示はフロントが `errors.apiStatus` で番号補間する）。
            message: format!("SwitchBot API status code {status_code}."),
            status_code: Some(status_code),
        }
    }

    /// デバイスオフライン（封筒 statusCode 161）。deviceId・名称等の秘匿値は含めない。
    pub fn offline() -> Self {
        Self::new(
            ErrorCode::Offline,
            "デバイスがオフラインのため操作できません。",
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn offline_serializes_code_as_camel_case_offline() {
        // フロント `isOfflineError` は `error.code === "offline"` で判定するため、
        // serde camelCase 出力が正確に "offline" であることを固定する（V2）。
        let err = SwitchBotError::offline();
        let json = serde_json::to_value(&err).expect("シリアライズできること");
        assert_eq!(json["code"], "offline");
    }

    #[test]
    fn offline_message_contains_no_secret_or_device_identifier() {
        // 追加メッセージに秘匿値・deviceId・デバイス名を含めない（V5）。
        let err = SwitchBotError::offline();
        assert_eq!(err.message, "デバイスがオフラインのため操作できません。");
    }

    #[test]
    fn api_status_serializes_status_code_as_camel_case() {
        // フロントは `errors.apiStatus` に `{{statusCode}}` を補間するため、
        // serde camelCase 出力が正確に "statusCode" で数値を保持することを固定する（V2/V3）。
        let err = SwitchBotError::api_status(190);
        let json = serde_json::to_value(&err).expect("シリアライズできること");
        assert_eq!(json["code"], "apiStatus");
        assert_eq!(json["statusCode"], 190);
    }

    #[test]
    fn non_api_status_errors_omit_status_code() {
        // apiStatus 以外は statusCode を持たない（skip_serializing_if で省略される）。
        let err = SwitchBotError::offline();
        let json = serde_json::to_value(&err).expect("シリアライズできること");
        assert!(json.get("statusCode").is_none());
    }
}
