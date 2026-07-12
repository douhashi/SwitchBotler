import type { HTMLAttributes, ReactNode } from "react";
import { ArrowDownToLine } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * お気に入りセクション ＝ **ドロップ先**。
 *
 * デバイスをここへドラッグして移すと登録され、**落とした位置がそのまま並び順**になる。
 * 外へドラッグすれば解除。ピンのようなボタンは持たない。
 *
 * 空でも必ず描画する（そうしないと「ここへドラッグできる」ことが発見できない）。
 * 「並び替え」ボタンは**並び替えだけ**を担う（登録・解除は持ち込まない）。
 */
export function FavoritesSection({
  title,
  count,
  editing,
  onToggleEditing,
  zoneProps,
  active,
  children,
}: {
  title: string;
  count: number;
  editing: boolean;
  onToggleEditing: () => void;
  /** {@link useFavoritesDnd} の `favoritesZoneProps`。 */
  zoneProps: HTMLAttributes<HTMLElement>;
  /** ドラッグ中のカードがこの上にあるか（受け入れ可能を示す）。 */
  active?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-xs font-semibold text-muted-foreground">{title}</h2>
        {count > 1 && (
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

      {/* 1 列固定。この並びがトレイポップアップの表示順にもなる。 */}
      <div
        role="list"
        aria-label={title}
        {...zoneProps}
        className={cn(
          "flex min-h-[76px] flex-col gap-2.5 rounded-2xl p-2.5 shadow-inset transition-colors",
          // 受け入れ可能を枠色で示す。ring ではなく outline を使うのは、ring が
          // box-shadow で描かれ shadow-inset（この配色系の凹み表現）と同じプロパティを
          // 奪い合って消えてしまうため。outline は独立プロパティなので共存できる。
          active && "bg-sd-accent/5 outline-2 -outline-offset-2 outline-sd-accent",
        )}
      >
        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center">
            <ArrowDownToLine
              size={18}
              strokeWidth={1.9}
              className="text-muted-foreground"
            />
            <span className="text-[12.5px] text-muted-foreground">
              {t("favorites.dropHint")}
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
