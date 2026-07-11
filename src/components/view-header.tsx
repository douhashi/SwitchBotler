import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ViewHeaderProps = {
  title: string;
  subtitle?: string;
  /** 右側のアクション（更新ボタンや電源スイッチ等）。 */
  actions?: ReactNode;
  /** 指定時に戻るボタンを表示する。 */
  onBack?: () => void;
  backLabel?: string;
};

/** 各画面共通のヘッダ。タイトル/サブタイトル + 任意の戻るボタン・右アクション。 */
export function ViewHeader({
  title,
  subtitle,
  actions,
  onBack,
  backLabel,
}: ViewHeaderProps) {
  const { t } = useTranslation("common");
  const backText = backLabel ?? t("actions.back");
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {onBack && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={backText}
            onClick={onBack}
          >
            <ChevronLeft strokeWidth={2} />
          </Button>
        )}
        <div>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
