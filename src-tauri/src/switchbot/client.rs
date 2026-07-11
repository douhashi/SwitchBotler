//! SwitchBot Cloud API v1.1 クライアント。
//!
//! reqwest の `Client` を再利用し、リクエストごとに `t` / `nonce` を生成して
//! 署名を付与する。成功判定は **HTTP 200 かつ封筒 statusCode === 100**。
//! 秘匿値（token / secret / 署名）はログに出さない。

use std::time::{SystemTime, UNIX_EPOCH};

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Client, Method};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use super::credentials::Credentials;
use super::error::SwitchBotError;
use super::mapping::{self, DeviceDto, SceneDto, SensorReadingsDto};
use super::signature;

const BASE_URL: &str = "https://api.switch-bot.com/v1.1";
/// 封筒の成功コード（公式仕様）。
const STATUS_OK: i64 = 100;

/// API レスポンスの共通封筒。
#[derive(Debug, Deserialize)]
struct Envelope {
    #[serde(rename = "statusCode")]
    status_code: i64,
    body: Value,
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

    /// 汎用リクエスト。auth ヘッダ付与 + 401/429 判定 + 封筒 statusCode 検査を DRY 化し、
    /// 成功時は `body` を返す。秘匿値は一切ログ/文言に載せない。
    async fn request_json(
        &self,
        creds: &Credentials,
        method: Method,
        path: &str,
        body: Option<Value>,
    ) -> Result<Value, SwitchBotError> {
        let headers = Self::auth_headers(creds)?;
        let mut req = self
            .http
            .request(method, format!("{BASE_URL}{path}"))
            .headers(headers);
        if let Some(payload) = body {
            req = req.json(&payload);
        }

        let resp = req.send().await.map_err(|_| SwitchBotError::network())?;

        match resp.status() {
            reqwest::StatusCode::UNAUTHORIZED => return Err(SwitchBotError::unauthorized()),
            reqwest::StatusCode::TOO_MANY_REQUESTS => return Err(SwitchBotError::rate_limited()),
            _ => {}
        }

        let envelope: Envelope = resp.json().await.map_err(|_| SwitchBotError::network())?;
        if envelope.status_code != STATUS_OK {
            return Err(SwitchBotError::api_status(envelope.status_code));
        }
        Ok(envelope.body)
    }

    /// `GET /v1.1/devices` を叩きデバイス件数を返す。接続テストの疎通に使う。
    pub async fn get_devices(&self, creds: &Credentials) -> Result<usize, SwitchBotError> {
        let body = self
            .request_json(creds, Method::GET, "/devices", None)
            .await?;
        let count = body
            .get("deviceList")
            .and_then(Value::as_array)
            .map(|list| list.len())
            .unwrap_or(0);
        Ok(count)
    }

    /// デバイス一覧を取得し、対応種別は status も取得して view-model DTO を組み立てる。
    /// レート節約のため未対応種別は status を取得しない（決定4）。
    pub async fn list_devices(
        &self,
        creds: &Credentials,
    ) -> Result<Vec<DeviceDto>, SwitchBotError> {
        let body = self
            .request_json(creds, Method::GET, "/devices", None)
            .await?;
        let metas = mapping::map_device_list(&body);

        let mut devices = Vec::with_capacity(metas.len());
        for meta in &metas {
            let status = if meta.supported {
                // 個別 status の失敗は致命ではない（未取得＝プレースホルダ）が、
                // 認証/レートは全体失敗として伝播させる。
                match self.get_status_body(creds, &meta.id).await {
                    Ok(body) => Some(body),
                    Err(e)
                        if matches!(
                            e.code,
                            super::error::ErrorCode::Unauthorized
                                | super::error::ErrorCode::RateLimited
                        ) =>
                    {
                        return Err(e)
                    }
                    Err(_) => None,
                }
            } else {
                None
            };
            devices.push(mapping::build_device(meta, status.as_ref()));
        }
        Ok(devices)
    }

    /// `GET /v1.1/devices/{id}/status` の生 body。
    async fn get_status_body(
        &self,
        creds: &Credentials,
        id: &str,
    ) -> Result<Value, SwitchBotError> {
        self.request_json(creds, Method::GET, &format!("/devices/{id}/status"), None)
            .await
    }

    /// `POST /v1.1/devices/{id}/commands`。成功（statusCode 100）なら Ok(())。
    /// `setColor` は parameter を preset id として受け取り、Rust で "R:G:B" に変換する（決定2）。
    pub async fn send_command(
        &self,
        creds: &Credentials,
        id: &str,
        command: &str,
        parameter: &str,
        command_type: &str,
    ) -> Result<(), SwitchBotError> {
        let parameter = if command == "setColor" {
            mapping::preset_to_rgb(parameter)
        } else {
            parameter.to_string()
        };
        let payload = json!({
            "command": command,
            "parameter": parameter,
            "commandType": command_type,
        });
        self.request_json(
            creds,
            Method::POST,
            &format!("/devices/{id}/commands"),
            Some(payload),
        )
        .await?;
        Ok(())
    }

    /// `GET /v1.1/scenes` → SceneDto 一覧（body 直下が配列）。
    pub async fn list_scenes(&self, creds: &Credentials) -> Result<Vec<SceneDto>, SwitchBotError> {
        let body = self
            .request_json(creds, Method::GET, "/scenes", None)
            .await?;
        Ok(mapping::map_scenes(&body))
    }

    /// `POST /v1.1/scenes/{id}/execute`。
    pub async fn execute_scene(&self, creds: &Credentials, id: &str) -> Result<(), SwitchBotError> {
        self.request_json(
            creds,
            Method::POST,
            &format!("/scenes/{id}/execute"),
            Some(json!({})),
        )
        .await?;
        Ok(())
    }

    /// すべてのセンサー系デバイス（温湿度計・人感センサー）の status を取得し、
    /// センサーごとに 1 件返す。対象が無ければ空 Vec（フロントは空状態表示）。
    pub async fn get_sensors(
        &self,
        creds: &Credentials,
    ) -> Result<Vec<SensorReadingsDto>, SwitchBotError> {
        let body = self
            .request_json(creds, Method::GET, "/devices", None)
            .await?;
        let metas = mapping::map_device_list(&body);
        let mut readings = Vec::new();
        for m in metas.iter().filter(|m| mapping::is_sensor(&m.device_type)) {
            let status = self.get_status_body(creds, &m.id).await?;
            readings.push(mapping::build_sensor_readings(&m.id, &m.name, &status));
        }
        Ok(readings)
    }
}

/// 13 桁のミリ秒タイムスタンプ文字列。
fn current_millis() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
