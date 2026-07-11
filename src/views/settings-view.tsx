import { useEffect } from "react";
import { ArrowRight, ShieldCheck, X } from "lucide-react";

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
  const load = useConnectionStore((s) => s.load);
  const testConnection = useConnectionStore((s) => s.testConnection);
  const disconnect = useConnectionStore((s) => s.disconnect);

  useEffect(() => {
    load();
  }, [load]);

  const testing = connection.status === "testing";

  return (
    <div>
      <ViewHeader title="認証設定" subtitle="SwitchBot API の認証情報" />

      <ConnectionBanner connection={connection} />

      <SecretField id="token" label="トークン" value={connection.tokenMasked} />
      <SecretField
        id="secret"
        label="シークレット"
        value={connection.secretMasked}
        help="SwitchBot アプリ → プロフィール → 設定 → 開発者向けオプション で発行できます。"
      />

      <div className="mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs text-muted-foreground shadow-inset-sm">
        <ShieldCheck size={15} strokeWidth={1.75} className="shrink-0 text-sd-ok" />
        OS のセキュアストレージ（Keychain / Credential Manager / Secret Service）に保管されます。
      </div>

      <div className="flex gap-2.5">
        <Button onClick={testConnection} disabled={testing}>
          <ArrowRight strokeWidth={2} />
          {testing ? "確認中…" : "接続をテスト"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
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
