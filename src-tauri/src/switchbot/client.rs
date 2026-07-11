//! SwitchBot Cloud API v1.1 クライアント。
//!
//! reqwest の `Client` を再利用し、リクエストごとに `t` / `nonce` を生成して
//! 署名を付与する。接続判定は **HTTP 200 かつ封筒 statusCode === 100**。
//! 秘匿値（token / secret / 署名）はログに出さない。

use std::time::{SystemTime, UNIX_EPOCH};

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::Deserialize;
use uuid::Uuid;

use super::credentials::Credentials;
use super::error::SwitchBotError;
use super::signature;

const BASE_URL: &str = "https://api.switch-bot.com/v1.1";
/// 封筒の成功コード（公式仕様）。
const STATUS_OK: i64 = 100;

/// API レスポンスの共通封筒。
#[derive(Debug, Deserialize)]
struct Envelope {
    #[serde(rename = "statusCode")]
    status_code: i64,
    body: serde_json::Value,
}

/// SwitchBot API クライアント。`Client` を再利用する。
pub struct SwitchBotClient {
    http: Client,
}

impl SwitchBotClient {
    pub fn new() -> Result<Self, SwitchBotError> {
        let http = Client::builder()
            .build()
            .map_err(|_| SwitchBotError::network())?;
        Ok(Self { http })
    }

    /// 認証ヘッダを組み立てる。`t` / `nonce` を生成し署名を付与する。
    fn auth_headers(creds: &Credentials) -> Result<HeaderMap, SwitchBotError> {
        let t = current_millis();
        let nonce = Uuid::new_v4().to_string();
        let sign = signature::sign(&creds.token, &creds.secret, &t, &nonce);

        // 秘匿値を含むためエラー時も値をログ/文言に載せない。
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&creds.token).map_err(|_| SwitchBotError::network())?,
        );
        headers.insert(
            "sign",
            HeaderValue::from_str(&sign).map_err(|_| SwitchBotError::network())?,
        );
        headers.insert(
            "t",
            HeaderValue::from_str(&t).map_err(|_| SwitchBotError::network())?,
        );
        headers.insert(
            "nonce",
            HeaderValue::from_str(&nonce).map_err(|_| SwitchBotError::network())?,
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        Ok(headers)
    }

    /// `GET /v1.1/devices` を叩き、デバイス件数を返す。接続テストの疎通に使う。
    /// HTTP 401 → Unauthorized、封筒 statusCode != 100 → ApiStatus。
    pub async fn get_devices(&self, creds: &Credentials) -> Result<usize, SwitchBotError> {
        let headers = Self::auth_headers(creds)?;
        let resp = self
            .http
            .get(format!("{BASE_URL}/devices"))
            .headers(headers)
            .send()
            .await
            .map_err(|_| SwitchBotError::network())?;

        if resp.status() == reqwest::StatusCode::UNAUTHORIZED {
            return Err(SwitchBotError::unauthorized());
        }

        let envelope: Envelope = resp.json().await.map_err(|_| SwitchBotError::network())?;
        if envelope.status_code != STATUS_OK {
            return Err(SwitchBotError::api_status(envelope.status_code));
        }

        // body.deviceList の件数を返す（存在しなければ 0）。
        let count = envelope
            .body
            .get("deviceList")
            .and_then(|v| v.as_array())
            .map(|list| list.len())
            .unwrap_or(0);
        Ok(count)
    }
}

/// 13 桁のミリ秒タイムスタンプ文字列。
fn current_millis() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
