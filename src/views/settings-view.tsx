import { useEffect, useState } from "react";
import { ArrowRight, Save, ShieldCheck, TriangleAlert, X } from "lucide-react";

import { ConnectionBanner } from "@/components/connection/connection-banner";
import { SecretField } from "@/components/connection/secret-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { useConnectionStore } from "@/stores/connection-store";

export function SettingsView() {
  const connection = useConnectionStore((s) => s.connection);
  const error = useConnectionStore((s) => s.error);
  const load = useConnectionStore((s) => s.load);
  const saveCredentials = useConnectionStore((s) => s.saveCredentials);
  const testConnection = useConnectionStore((s) => s.testConnection);
  const disconnect = useConnectionStore((s) => s.disconnect);

  // 平文の Token / Secret はこの view のローカル state にのみ一時保持し、保存後にクリアする。
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const testing = connection.status === "testing";
  const canSave = token.length > 0 && secret.length > 0 && !testing;

  const handleSave = async () => {
    await saveCredentials(token, secret);
    // 保存に成功したら平文を破棄する（失敗時も残さない）。
    setToken("");
    setSecret("");
  };

  return (
    <div>
      <ViewHeader title="認証設定" subtitle="SwitchBot API の認証情報" />

      <ConnectionBanner connection={connection} />

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs text-destructive shadow-inset-sm">
          <TriangleAlert size={15} strokeWidth={1.9} className="shrink-0" />
          {error}
        </div>
      )}

      <SecretField
        id="token"
        label="トークン"
        value={token}
        onChange={setToken}
        saved={connection.saved}
      />
      <SecretField
        id="secret"
        label="シークレット"
        value={secret}
        onChange={setSecret}
        saved={connection.saved}
        help="SwitchBot アプリ → プロフィール → 設定 → 開発者向けオプション で発行できます。"
      />

      <div className="mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs text-muted-foreground shadow-inset-sm">
        <ShieldCheck size={15} strokeWidth={1.75} className="shrink-0 text-sd-ok" />
        OS のセキュアストレージ（Keychain / Credential Manager / Secret Service）に保管されます。
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button onClick={handleSave} disabled={!canSave}>
          <Save strokeWidth={2} />
          保存して接続
        </Button>

        <Button variant="secondary" onClick={testConnection} disabled={testing || !connection.saved}>
          <ArrowRight strokeWidth={2} />
          {testing ? "確認中…" : "接続をテスト"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!connection.saved}>
              <X strokeWidth={2} />
              接続を解除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>接続を解除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                保存された Token / Secret を削除し、SwitchBot API との接続を解除します。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={disconnect}>
                解除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
