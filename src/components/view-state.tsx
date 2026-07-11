import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** 取得中の共通表示。 */
export function LoadingState({ label = "読み込み中…" }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

/** エラーの共通表示（安全メッセージ + 再試行）。 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-raise">
      <p className="text-sm text-destructive">{message}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        <RefreshCw strokeWidth={2} />
        再試行
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
