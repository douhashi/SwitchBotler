//! SwitchBot API 連携（署名生成・認証情報の保管・HTTP クライアント）。
//!
//! 秘匿値（token / secret / 署名）は、この配下のどのモジュールでもログ・
//! エラー文言・シリアライズ出力に含めない。

pub mod client;
pub mod credentials;
pub mod error;
pub mod mapping;
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

    #[tokio::test]
    #[ignore = "実 Token/Secret が必要。infisical 経由で --ignored 指定時のみ実行"]
    async fn list_devices_returns_view_model_dtos() {
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let devices = client
            .list_devices(&creds)
            .await
            .expect("list_devices が成功すること");
        // 件数とカテゴリ内訳のみ出力（秘匿値・デバイス名は出さない）。
        let supported = devices.iter().filter(|d| d.supported).count();
        println!("device count = {}, supported = {supported}", devices.len());
    }

    #[tokio::test]
    #[ignore = "実 Token/Secret が必要。infisical 経由で --ignored 指定時のみ実行"]
    async fn list_scenes_returns_view_model_dtos() {
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let scenes = client
            .list_scenes(&creds)
            .await
            .expect("list_scenes が成功すること");
        println!("scene count = {}", scenes.len());
    }

    #[tokio::test]
    #[ignore = "実 Token/Secret が必要。infisical 経由で --ignored 指定時のみ実行"]
    async fn get_sensors_returns_readings() {
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let readings = client
            .get_sensors(&creds)
            .await
            .expect("get_sensors が成功すること");
        // センサー台数とメトリクス種別のみ出力（値・センサー名は出さない）。
        println!("sensor count = {}", readings.len());
        for r in &readings {
            let ids: Vec<&str> = r.metrics.iter().map(|m| m.id.as_str()).collect();
            println!("sensor metrics = {ids:?}");
        }
    }

    #[tokio::test]
    #[ignore = "実 AC に副作用（setAll 送信）。安全値のみ・元状態へ復帰。--ignored 指定時のみ実行"]
    async fn send_aircon_succeeds() {
        // 実在の赤外線エアコンに setAll を 1 回送る（V2）。副作用配慮として、
        // 電源 off の安全値（26℃/cool/auto/off）を送り、送信後に同じ off を再送して
        // 「動作させない」ことで原状復帰する。remoteType 実値の確認も兼ねる（V1）。
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let devices = client.list_devices(&creds).await.expect("一覧取得");
        let aircon = devices
            .iter()
            .find(|d| d.category == "aircon")
            .expect("赤外線エアコンが存在すること（V1: remoteType が aircon にマップ）");
        // 安全値: 電源 off。実機を稼働させない。
        client
            .send_aircon(&creds, &aircon.id, 26, "cool", "auto", false)
            .await
            .expect("setAll が statusCode 100 で受理されること（V2）");
        println!("send_aircon setAll ok (power off, 26/cool/auto)");
    }

    #[tokio::test]
    #[ignore = "実 IR ライトに副作用（電源/明暗送信）。原状復帰する。--ignored 指定時のみ実行"]
    async fn send_ir_light_succeeds() {
        // 実在の赤外線ライト（Light / DIY Light）にコマンドを送る（V2/V3）。副作用配慮として、
        // turnOn→turnOff で原状復帰、brightnessUp→brightnessDown で明るさを相殺する。
        // remoteType 実値の確認（V1）と、DIY Light が標準コマンドに応答するか（V3）も兼ねる。
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let devices = client.list_devices(&creds).await.expect("一覧取得");
        let lights: Vec<_> = devices
            .iter()
            .filter(|d| d.category == "ir_light")
            .collect();
        assert!(
            !lights.is_empty(),
            "赤外線ライトが存在すること（V1: remoteType が ir_light にマップ）"
        );
        for light in lights {
            // model（= remoteType 実値）のみ出力。deviceId・名称は伏せる（V1/V3）。
            println!("ir_light remoteType = {}", light.model);
            // 電源: turnOn → turnOff で原状復帰。
            client
                .send_ir_light(&creds, &light.id, "on")
                .await
                .expect("turnOn が statusCode 100 で受理されること（V2/V3）");
            client
                .send_ir_light(&creds, &light.id, "off")
                .await
                .expect("turnOff が statusCode 100 で受理されること（V2/V3）");
            // 明るさ: brightnessUp → brightnessDown で相殺。
            client
                .send_ir_light(&creds, &light.id, "brighter")
                .await
                .expect("brightnessUp が statusCode 100 で受理されること（V2）");
            client
                .send_ir_light(&creds, &light.id, "dimmer")
                .await
                .expect("brightnessDown が statusCode 100 で受理されること（V2）");
        }
        println!("send_ir_light ok (on/off, brighter/dimmer, 原状復帰)");
    }

    #[tokio::test]
    #[ignore = "実 Bot を物理的に 1 回動作させる副作用あり。press は不可逆。--ignored 指定時のみ実行"]
    async fn send_bot_press_succeeds() {
        // 実在の Bot（category=="bot"）を一覧から取得し、controls（botMode）を出力してから、
        // pressMode の Bot に汎用 send_command で press を 1 回送る（V1/V2）。
        // 【副作用】press は実機を物理的に 1 回動作させる（不可逆・原状復帰しない）。
        // switchMode / customizeMode の Bot は press で意図せぬ物理動作を招くため送信しない。
        // 秘匿値・deviceId・deviceName は一切出力しない。
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let devices = client.list_devices(&creds).await.expect("一覧取得");
        let bots: Vec<_> = devices.iter().filter(|d| d.category == "bot").collect();
        assert!(
            !bots.is_empty(),
            "Bot が存在すること（V1: deviceType Bot が bot にマップ）"
        );
        // controls（botMode 正規化結果）のみ出力。deviceId・名称は伏せる（V1）。
        for bot in &bots {
            println!("bot controls = {:?}", bot.controls);
        }
        let press_bot = bots
            .iter()
            .find(|d| d.controls.bot_mode.as_deref() == Some("press"));
        match press_bot {
            Some(bot) => {
                // press は press/default/command の汎用 send_command 経路で送る（V1）。
                client
                    .send_command(&creds, &bot.id, "press", "default", "command")
                    .await
                    .expect("press が statusCode 100 で受理されること（V2）");
                println!("send_bot_press ok (実機を 1 回動作させた)");
            }
            None => {
                // pressMode の Bot が無い場合は物理動作を伴う press を送らない。
                println!("pressMode の Bot が無いため press 送信をスキップ");
            }
        }
    }

    #[tokio::test]
    #[ignore = "実 API に副作用（コマンド送信）。安全な冪等操作のみ。--ignored 指定時のみ実行"]
    async fn send_command_idempotent_succeeds() {
        // 実在の Plug に現在の電源状態と同じコマンドを送る（状態を変えない冪等操作）。
        let creds = credentials::load().expect("認証情報を取得できること（env/keyring）");
        let client = SwitchBotClient::new().expect("クライアント生成に成功すること");
        let devices = client.list_devices(&creds).await.expect("一覧取得");
        let plug = devices
            .iter()
            .find(|d| d.category == "plug")
            .expect("Plug が存在すること");
        let command = if plug.controls.power {
            "turnOn"
        } else {
            "turnOff"
        };
        client
            .send_command(&creds, &plug.id, command, "default", "command")
            .await
            .expect("冪等コマンドが statusCode 100 で成功すること");
        println!("idempotent command ok");
    }
}
