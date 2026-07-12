import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * お気に入りセクションの外枠（デバイス / シーン共通）。mockup index 05 に対応。
 *
 * 並び替えは**モード**にする（progressive disclosure）。普段の行は操作に集中させ、
 * 「並び替え」を押したときだけ行が整理用の道具に変わる。整理中は操作系を隠すので、
 * 並べ替えのつもりでエアコンを点けてしまう、といった誤操作が起きない。
 */
export function FavoritesSection({
  title,
  editing,
  onToggleEditing,
  /** 2 件未満なら並び替えボタンを出さない（並べ替えるものが無い）。 */
  reorderable,
  children,
}: {
  title: string;
  editing: boolean;
  onToggleEditing: () => void;
  reorderable: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-xs font-semibold text-muted-foreground">{title}</h2>
        {reorderable && (
          <button
            type="button"
            aria-pressed={editing}
            onClick={onToggleEditing}
            className={cn(
              "rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors",
              editing
                ? "text-sd-accent shadow-inset-sm"
                : "text-muted-foreground shadow-raise-sm hover:text-foreground",
            )}
          >
            {editing ? t("actions.done") : t("actions.reorder")}
          </button>
        )}
      </div>
      {/* 1 列固定。並び順がそのままトレイポップアップの表示順になる。 */}
      <div role="list" aria-label={title} className="flex flex-col gap-2.5">
        {children}
      </div>
    </section>
  );
}
