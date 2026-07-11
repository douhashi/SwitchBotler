import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppErrorCode } from "@/i18n/error";

/** 取得中の共通表示。 */
export function LoadingState() {
  const { t } = useTranslation("common");
  return <p className="text-sm text-muted-foreground">{t("states.loading")}</p>;
}

/** エラーの共通表示（コードを翻訳した安全メッセージ + 再試行）。 */
export function ErrorState({
  code,
  statusCode,
  onRetry,
}: {
  code: AppErrorCode;
  statusCode?: number;
  onRetry: () => void;
}) {
  const { t } = useTranslation("errors");
  const { t: tc } = useTranslation("common");
  return (
    <div className="rounded-2xl bg-card p-4 shadow-raise">
      <p className="text-sm text-destructive">{t(code, { statusCode })}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        <RefreshCw strokeWidth={2} />
        {tc("actions.retry")}
      </Button>
    </div>
  );
}

/** 空状態の共通表示。 */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-inset-sm">
      {children}
    </div>
  );
}
