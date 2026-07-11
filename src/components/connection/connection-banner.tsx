import { useTranslation } from "react-i18next";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ConnectionState } from "@/data";

/** 接続状態のバナー（mockup .banner）。色だけに頼らずアイコン + テキストで伝える。 */
export function ConnectionBanner({
  connection,
}: {
  connection: ConnectionState;
}) {
  const { t } = useTranslation("connection");
  const { t: tc } = useTranslation("common");
  const { status, lastCheckedAt, rateLimit } = connection;

  if (status === "connected") {
    return (
      <Alert className="mb-5 text-sd-ok">
        <ShieldCheck strokeWidth={1.9} />
        <AlertTitle className="text-foreground">{tc("states.connected")}</AlertTitle>
        <AlertDescription>
          {t("banner.connectedDetail", {
            lastChecked: lastCheckedAt ?? "—",
            limit: rateLimit.toLocaleString(),
          })}
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "testing") {
    return (
      <Alert className="mb-5 text-sd-accent">
        <Loader2 className="animate-spin" strokeWidth={1.9} />
        <AlertTitle className="text-foreground">{t("banner.testing")}</AlertTitle>
        <AlertDescription>{t("banner.testingDetail")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="mb-5">
      <TriangleAlert strokeWidth={1.9} />
      <AlertTitle>{tc("states.disconnected")}</AlertTitle>
      <AlertDescription>{t("banner.disconnectedDetail")}</AlertDescription>
    </Alert>
  );
}
