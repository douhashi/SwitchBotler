//! SwitchBot API 連携（署名生成・認証情報の保管・HTTP クライアント）。
//!
//! 秘匿値（token / secret / 署名）は、この配下のどのモジュールでもログ・
//! エラー文言・シリアライズ出力に含めない。

pub mod client;
pub mod credentials;
pub mod error;
pub mod signature;

pub use client::SwitchBotClient;
pub use error::SwitchBotError;

#[cfg(test)]
mod integration_tests {
    //! 実 API 疎通テスト。通常の `cargo test` では走らせない（`#[ignore]`）。
    //! 実行方法: `infisical run --env=dev -- cargo test -- --ignored`
    //! （env に SWITCHBOT_TOKEN / SWITCHBOT_SECRET が注入される）。
    //! 秘匿値・署名は一切出力しない。

    use super::credentials::{self, Credentials};
    use super::error::ErrorCode;
    use super::SwitchBotClient;

    #[tokio::test]
    #[ignore = "実 Token/Secret が必要。infisical 経由で --ignored 指定時のみ実行"]
    async fn get_devices_succeeds_with_real_credentials() {
        // debug ビルドでは keyring 空時に env（Infisical 注入）へフォールバックする。
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let count = client
            .get_devices(&creds)
            .await
            .expect("GET /v1.1/devices が成功すること（HTTP 200 / statusCode 100）");
        // 件数のみ出力（秘匿値・署名は出さない）。
        println!("device count = {count}");
    }

    #[tokio::test]
    #[ignore = "誤認証情報での 401 検知確認。--ignored 指定時のみ実行"]
    async fn get_devices_rejects_invalid_credentials() {
        let creds = Credentials {
            token: "invalid-token-for-test".to_string(),
            secret: "invalid-secret-for-test".to_string(),
        };
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let err = client
            .get_devices(&creds)
            .await
            .expect_err("誤認証情報では失敗すること");
        assert_eq!(err.code, ErrorCode::Unauthorized, "401 を検知すること");
        println!("error code = {:?}", err.code);
    }
}
