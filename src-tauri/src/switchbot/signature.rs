//! SwitchBot API v1.1 の署名生成（純関数）。
//!
//! 署名は `HMAC-SHA256(token + t + nonce, secret)` を Base64 エンコードし、
//! 最後に **大文字化** したもの（公式仕様）。
//! `t`（ミリ秒タイムスタンプ）・`nonce`（UUID）は呼び出し側が生成して渡す。
//!
//! 秘匿値（token / secret）や署名結果はログに出さない。

use base64::{engine::general_purpose::STANDARD, Engine};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// `token + t + nonce` を `secret` を鍵に HMAC-SHA256 → Base64 → 大文字化して返す。
pub fn sign(token: &str, secret: &str, t: &str, nonce: &str) -> String {
    // HMAC は任意長の鍵を受け付けるため new_from_slice は失敗しない。
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC は任意長の鍵を受け付ける");
    mac.update(token.as_bytes());
    mac.update(t.as_bytes());
    mac.update(nonce.as_bytes());
    let digest = mac.finalize().into_bytes();
    STANDARD.encode(digest).to_uppercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    // 固定入力に対する期待値をピン留めする（公式仕様: HMAC-SHA256→Base64→大文字化）。
    // 期待値は Python 参照実装で算出（token+t+nonce を secret で HMAC）。
    #[test]
    fn sign_matches_pinned_vector() {
        let sign = sign(
            "test-token",
            "test-secret",
            "1700000000000",
            "00000000-0000-4000-8000-000000000000",
        );
        assert_eq!(sign, "OBPX7JZBQVFCJWAV6DN0CO/1GZLEACHDAJQBJOZFHOA=");
    }

    // 出力は大文字化された Base64 であること（英小文字を含まない）。
    #[test]
    fn sign_output_is_uppercase_base64() {
        let sign = sign("token", "secret", "1234567890123", "nonce-value");
        assert!(!sign.is_empty());
        assert!(
            !sign.chars().any(|c| c.is_ascii_lowercase()),
            "署名に小文字が含まれてはならない"
        );
        // Base64 標準アルファベット（大文字化後）+ パディングのみ。
        assert!(sign
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || matches!(c, '+' | '/' | '=')));
    }

    // 入力のいずれかが変われば署名も変わる。
    #[test]
    fn sign_changes_with_inputs() {
        let base = sign("t", "s", "1", "n");
        assert_ne!(base, sign("t2", "s", "1", "n"));
        assert_ne!(base, sign("t", "s2", "1", "n"));
        assert_ne!(base, sign("t", "s", "2", "n"));
        assert_ne!(base, sign("t", "s", "1", "n2"));
    }
}
