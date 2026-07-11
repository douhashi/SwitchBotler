import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ConnectionState } from "@/data";

/** 接続状態のバナー（mockup .banner）。色だけに頼らずアイコン + テキストで伝える。 */
export function ConnectionBanner({
  connection,
}: {
  connection: ConnectionState;
}) {
  const { status, lastCheckedAt, rateRemaining, rateLimit } = connection;

  if (status === "connected") {
    return (
      <Alert className="text-sd-ok">
        <ShieldCheck strokeWidth={1.9} />
        <AlertTitle className="text-foreground">接続済み</AlertTitle>
        <AlertDescription>
          最終確認 {lastCheckedAt ?? "—"} · レート残{" "}
          {rateRemaining.toLocaleString()} / {rateLimit.toLocaleString()}
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "testing") {
    return (
      <Alert className="text-sd-accent">
        <Loader2 className="animate-spin" strokeWidth={1.9} />
        <AlertTitle className="text-foreground">接続を確認中…</AlertTitle>
        <AlertDescription>SwitchBot API に問い合わせています。</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <TriangleAlert strokeWidth={1.9} />
      <AlertTitle>未接続</AlertTitle>
      <AlertDescription>
        Token / Secret を入力して接続をテストしてください。
      </AlertDescription>
    </Alert>
  );
}
