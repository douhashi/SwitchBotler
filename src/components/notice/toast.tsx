import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";

import { useNoticeStore } from "@/stores/notice-store";

/**
 * 画面右下に一過性の通知を重ねて表示する。
 * 操作失敗（楽観ロールバック時）など、全画面横断の回復導線を補う。
 */
export function ToastViewport() {
  const { t } = useTranslation("errors");
  const { t: tc } = useTranslation("common");
  const notices = useNoticeStore((s) => s.notices);
  const dismiss = useNoticeStore((s) => s.dismiss);

  if (notices.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
      {notices.map((notice) => (
        <div
          key={notice.id}
          role="status"
          className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl bg-card p-3 text-sm shadow-raise"
        >
          <AlertTriangle
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-destructive"
          />
          <span className="flex-1 text-foreground">
            {t(notice.code, { statusCode: notice.statusCode })}
          </span>
          <button
            type="button"
            aria-label={tc("actions.close")}
            onClick={() => dismiss(notice.id)}
            className="shrink-0 rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
