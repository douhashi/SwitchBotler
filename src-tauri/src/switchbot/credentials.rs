//! Token / Secret のセキュアストレージ管理（OS keyring）。
//!
//! - 本番の単一の正（SSoT）は OS セキュアストレージ（keyring）。
//! - `load` は **keyring 優先**。keyring が空/取得不可のときのみ、
//!   **debug ビルドに限り** 環境変数（Infisical 注入）へフォールバックする。
//!   `release` では env 経路そのものをコンパイル時に除去する（本番フォールバック禁止）。
//! - 秘匿値はログに出さない。

use keyring::Entry;

use super::error::SwitchBotError;

/// keyring のサービス名（アプリ識別子）。
const SERVICE: &str = "com.douhashi.botler";
/// keyring のアカウント名。token / secret を別エントリで保持する。
const TOKEN_ACCOUNT: &str = "switchbot-token";
const SECRET_ACCOUNT: &str = "switchbot-secret";

/// 取得済みの認証情報。秘匿値そのものを保持するため、外部へ露出しないこと。
pub struct Credentials {
    pub token: String,
    pub secret: String,
}

fn entry(account: &str) -> Result<Entry, SwitchBotError> {
    Entry::new(SERVICE, account).map_err(|_| SwitchBotError::storage())
}

/// Token / Secret を keyring に保存する。
pub fn save(token: &str, secret: &str) -> Result<(), SwitchBotError> {
    entry(TOKEN_ACCOUNT)?
        .set_password(token)
        .map_err(|_| SwitchBotError::storage())?;
    entry(SECRET_ACCOUNT)?
        .set_password(secret)
        .map_err(|_| SwitchBotError::storage())?;
    Ok(())
}

/// keyring から Token / Secret を取得する。両方揃っていれば `Some`。
fn load_from_keyring() -> Option<Credentials> {
    let token = entry(TOKEN_ACCOUNT).ok()?.get_password().ok()?;
    let secret = entry(SECRET_ACCOUNT).ok()?.get_password().ok()?;
    Some(Credentials { token, secret })
}

/// debug ビルド限定: 環境変数（Infisical 注入）から取得する。
/// `release` ではこの関数自体がコンパイルされない（本番 env フォールバック禁止）。
#[cfg(debug_assertions)]
fn load_from_env() -> Option<Credentials> {
    let token = std::env::var("SWITCHBOT_TOKEN").ok()?;
    let secret = std::env::var("SWITCHBOT_SECRET").ok()?;
    if token.is_empty() || secret.is_empty() {
        return None;
    }
    Some(Credentials { token, secret })
}

/// 認証情報を取得する。keyring 優先、debug のみ env フォールバック。
pub fn load() -> Result<Credentials, SwitchBotError> {
    if let Some(creds) = load_from_keyring() {
        return Ok(creds);
    }
    #[cfg(debug_assertions)]
    if let Some(creds) = load_from_env() {
        return Ok(creds);
    }
    Err(SwitchBotError::missing_credentials())
}

/// keyring のエントリを削除する。
pub fn delete() -> Result<(), SwitchBotError> {
    // 片方が既に無い場合でも成功扱いにする（冪等）。存在するものだけ削除する。
    delete_one(TOKEN_ACCOUNT)?;
    delete_one(SECRET_ACCOUNT)?;
    Ok(())
}

fn delete_one(account: &str) -> Result<(), SwitchBotError> {
    let entry = entry(account)?;
    // 存在する場合のみ削除する（未保存は成功扱いの冪等動作）。
    // keyring のバージョン差による "not found" バリアント名に依存しないよう
    // 取得可否で存在を判定する。
    if entry.get_password().is_ok() {
        entry
            .delete_credential()
            .map_err(|_| SwitchBotError::storage())?;
    }
    Ok(())
}

/// keyring に Token / Secret が保存されているか。
/// 「保存済み」の判定は keyring のみを見る（env フォールバックは含めない）。
pub fn has_credentials() -> bool {
    load_from_keyring().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    // 実 keyring を使う保存→取得→削除のラウンドトリップ（V5 / V6）。
    // 実行方法: `cargo test -- --ignored`（OS のセキュアストレージが必要。CI では走らせない）。
    // 秘匿値は出力しない。テスト後にエントリを必ず削除して汚さない。
    #[test]
    #[ignore = "実 keyring が必要。ローカル/実機でのみ実行"]
    fn keyring_save_load_delete_roundtrip() {
        // 前提を揃える（過去の残りを消す）。
        delete().expect("事前削除に成功すること");

        // 保存（V5）: save → has_credentials true → load で取得できる。
        save("roundtrip-token", "roundtrip-secret").expect("保存に成功すること");
        assert!(has_credentials(), "保存後は保存済みと判定されること");
        let loaded = load_from_keyring().expect("keyring から取得できること");
        assert_eq!(loaded.token, "roundtrip-token");
        assert_eq!(loaded.secret, "roundtrip-secret");

        // 解除（V6）: delete → has_credentials false。
        delete().expect("削除に成功すること");
        assert!(!has_credentials(), "削除後は未保存と判定されること");
    }
}
