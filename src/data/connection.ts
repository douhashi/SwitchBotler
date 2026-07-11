import type { ConnectionState } from "./types";

/**
 * 接続（認証）まわりのデータ境界。
 *
 * デバイス / シーン / センサーを扱う {@link SwitchBotlerDataSource} とは分離し、
 * 認証情報の保存・疎通テスト・解除だけを担う。実体は Tauri IPC 実装
 * （`tauri-connection.ts`）で、Rust バックエンドが署名生成・keyring 保管・
 * API 通信を行う。フロントは秘匿値を保持せず view-model のみに依存する。
 */
export interface ConnectionGateway {
  /** 現在の接続状態（保存済みか否か）を取得する。 */
  getConnection(): Promise<ConnectionState>;
  /** Token / Secret を OS セキュアストレージに保存する（疎通確認は行わない）。 */
  saveCredentials(token: string, secret: string): Promise<void>;
  /** 保存済み認証情報で疎通をテストする。失敗時は Error を throw する。 */
  testConnection(): Promise<ConnectionState>;
  /** 保存済み認証情報を削除する。 */
  disconnect(): Promise<ConnectionState>;
}
