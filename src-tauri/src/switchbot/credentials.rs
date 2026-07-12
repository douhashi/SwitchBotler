//! Token / Secret のセキュアストレージ管理（OS keyring）。
//!
//! - 本番の単一の正（SSoT）は OS セキュアストレージ（keyring）。
//! - token / secret は **単一エントリに JSON でまとめて** 保存する。keychain のプロンプトと
//!   アクセス回数を最小化するため（別エントリ 2 つだと読み取りごとに 2 回問われる）。
//! - さらに **起動中はプロセス内キャッシュ**を持ち、初回のみ keychain へアクセスする。
//! - `load` は **keyring 優先**。keyring が空/取得不可のときのみ、
//!   **debug ビルドに限り** 環境変数（Infisical 注入）へフォールバックする。
//!   `release` では env 経路そのものをコンパイル時に除去する（本番フォールバック禁止）。
//! - 秘匿値はログに出さない。

use std::sync::Mutex;

use keyring::Entry;
use serde::{Deserialize, Serialize};

use super::error::SwitchBotError;

/// keyring のサービス名（アプリ識別子。tauri.conf.json の identifier と一致させる）。
const SERVICE: &str = "io.github.douhashi.switchbotler";
/// token / secret を JSON でまとめて保持する単一エントリのアカウント名。
const CREDENTIALS_ACCOUNT: &str = "switchbot-credentials";

/// 取得済みの認証情報。秘匿値そのものを保持するため、外部へ露出しないこと。
#[derive(Clone)]
pub struct Credentials {
    pub token: String,
    pub secret: String,
}

/// keychain に保存する JSON 形状（token / secret を 1 エントリにまとめる）。
#[derive(Serialize, Deserialize)]
struct StoredCredentials {
    token: String,
    secret: String,
}

/// 起動中の認証情報キャッシュ。keychain アクセスを初回のみに抑えるためのプロセス内保持。
/// **keychain 由来の値のみ**を保持する（env フォールバックはキャッシュしない）。
/// `save` / `delete` で明示的に更新し、keychain と乖離させない。
static CACHE: Mutex<Option<Credentials>> = Mutex::new(None);

fn entry(account: &str) -> Result<Entry, SwitchBotError> {
    Entry::new(SERVICE, account).map_err(|_| SwitchBotError::storage())
}

fn cache_get() -> Option<Credentials> {
    CACHE.lock().ok()?.clone()
}

fn cache_set(creds: Option<Credentials>) {
    if let Ok(mut guard) = CACHE.lock() {
        *guard = creds;
    }
}

/// keychain へ単一 JSON エントリで書き込む。
fn write_keyring(creds: &Credentials) -> Result<(), SwitchBotError> {
    let json = serde_json::to_string(&StoredCredentials {
        token: creds.token.clone(),
        secret: creds.secret.clone(),
    })
    .map_err(|_| SwitchBotError::storage())?;
    entry(CREDENTIALS_ACCOUNT)?
        .set_password(&json)
        .map_err(|_| SwitchBotError::storage())
}

/// Token / Secret を keyring に保存する（単一 JSON エントリ）。成功時にキャッシュも更新する。
pub fn save(token: &str, secret: &str) -> Result<(), SwitchBotError> {
    let creds = Credentials {
        token: token.to_string(),
        secret: secret.to_string(),
    };
    write_keyring(&creds)?;
    cache_set(Some(creds));
    Ok(())
}

/// keyring から取得する（低レベル・キャッシュを経由しない）。単一 JSON エントリのみ。
fn read_keyring() -> Option<Credentials> {
    let json = entry(CREDENTIALS_ACCOUNT).ok()?.get_password().ok()?;
    let stored = serde_json::from_str::<StoredCredentials>(&json).ok()?;
    Some(Credentials {
        token: stored.token,
        secret: stored.secret,
    })
}

/// keychain 由来の認証情報をキャッシュ経由で取得する（初回のみ keychain へアクセス）。
fn cached_keyring_load() -> Option<Credentials> {
    if let Some(creds) = cache_get() {
        return Some(creds);
    }
    let creds = read_keyring()?;
    cache_set(Some(creds.clone()));
    Some(creds)
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

/// 認証情報を取得する。keyring（キャッシュ）優先、debug のみ env フォールバック。
pub fn load() -> Result<Credentials, SwitchBotError> {
    if let Some(creds) = cached_keyring_load() {
        return Ok(creds);
    }
    #[cfg(debug_assertions)]
    if let Some(creds) = load_from_env() {
        return Ok(creds);
    }
    Err(SwitchBotError::missing_credentials())
}

/// keyring のエントリを削除する。キャッシュもクリアする。
pub fn delete() -> Result<(), SwitchBotError> {
    delete_one(CREDENTIALS_ACCOUNT)?;
    cache_set(None);
    Ok(())
}

fn delete_one(account: &str) -> Result<(), SwitchBotError> {
    let entry = entry(account)?;
    // 存在する場合のみ削除する（未保存は成功扱いの冪等動作）。
    // keyring のバージョン差による "not found" バリアント名に依存しないよう
    // 取得可否で存在を判定する（存在しないエントリの読み取りはプロンプトを出さない）。
    if entry.get_password().is_ok() {
        entry
            .delete_credential()
            .map_err(|_| SwitchBotError::storage())?;
    }
    Ok(())
}

/// keyring に Token / Secret が保存されているか。
/// 「保存済み」の判定は keyring のみを見る（env フォールバックは含めない）。
/// キャッシュ経由で判定するため、起動後 2 回目以降は keychain へアクセスしない。
pub fn has_credentials() -> bool {
    cached_keyring_load().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// テスト間でプロセス内キャッシュを確実に空にする（keychain の実挙動を検証するため）。
    fn reset_cache() {
        cache_set(None);
    }

    // 実 keyring を使う保存→取得→削除のラウンドトリップ（V5 / V6）。
    // 実行方法: `cargo test -- --ignored`（OS のセキュアストレージが必要。CI では走らせない）。
    // 秘匿値は出力しない。テスト後にエントリを必ず削除して汚さない。
    #[test]
    #[ignore = "実 keyring が必要。ローカル/実機でのみ実行"]
    fn keyring_save_load_delete_roundtrip() {
        // 前提を揃える（過去の残りとキャッシュを消す）。
        delete().expect("事前削除に成功すること");
        reset_cache();

        // 保存（V5）: save → has_credentials true → load で取得できる。
        save("roundtrip-token", "roundtrip-secret").expect("保存に成功すること");
        assert!(has_credentials(), "保存後は保存済みと判定されること");
        let loaded = load().expect("load で取得できること");
        assert_eq!(loaded.token, "roundtrip-token");
        assert_eq!(loaded.secret, "roundtrip-secret");

        // キャッシュを空にしても keychain から再取得できる（単一エントリの往復）。
        reset_cache();
        let reloaded = read_keyring().expect("keyring から取得できること");
        assert_eq!(reloaded.token, "roundtrip-token");
        assert_eq!(reloaded.secret, "roundtrip-secret");

        // 解除（V6）: delete → has_credentials false。
        delete().expect("削除に成功すること");
        assert!(!has_credentials(), "削除後は未保存と判定されること");
    }
}
