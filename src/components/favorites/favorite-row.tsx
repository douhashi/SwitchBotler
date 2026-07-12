import type { HTMLAttributes, ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pin } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * お気に入り 1 行（デバイス / シーン共通）。mockup index 05 に対応。
 *
 * レイアウトの要点（これが横位置ズレの根治）:
 * - 行は **grid の固定トラック** `40px / 1fr / 138px`。可変幅のアクション
 *   （Switch・「>」・「押す」・「実行」）を列の中に閉じ込め、外へ漏らさない。
 *   flex だと右端の幅差がそのまま ↑↓・ピンの横位置差になり、行ごとにズレる。
 * - 右の**コントロール領域（138px）はモード間で不変**で、中身だけ入れ替える。
 *   通常   = grid `30px / 96px` → [ピン][アクション（右寄せ）]
 *   並び替え = flex 右寄せ        → [↑][↓][ドラッグハンドル]
 *   幅が変わらないので、モードを切り替えてもアイコン・名前は 1px も動かない。
 *
 * 並び替えは ↑↓ ボタンが主操作（キーボード可・端では disabled）、ドラッグは補助。
 */
export function FavoriteRow({
  name,
  status,
  icon,
  iconActive,
  action,
  offline,
  editing,
  position,
  total,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onUnfavorite,
  dragging,
  dragOver,
  dragProps,
}: {
  name: string;
  /** 状態サブラベル（無ければ省く）。 */
  status?: string;
  /** アイコン（svg 等）。タイル装飾は本コンポーネントが行う。 */
  icon: ReactNode;
  /** アイコンをアクセント色にするか（点灯中など）。 */
  iconActive?: boolean;
  /** 通常モードの操作系（Switch / 「>」/ 「押す」/ 「実行」）。 */
  action: ReactNode;
  offline?: boolean;
  /** 並び替えモードか。 */
  editing: boolean;
  /** 1 始まりの位置（読み上げ用）。 */
  position: number;
  total: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUnfavorite: () => void;
  dragging?: boolean;
  dragOver?: boolean;
  /** {@link useDragReorder} の `rowProps` を spread する。 */
  dragProps?: HTMLAttributes<HTMLElement> & { draggable?: boolean };
}) {
  const { t } = useTranslation("common");
  const { t: td } = useTranslation("devices");

  return (
    <div
      role="listitem"
      aria-label={t("favorites.positionAria", { name, position, total })}
      {...dragProps}
      className={cn(
        "grid grid-cols-[40px_1fr_138px] items-center gap-3 rounded-2xl bg-card p-3.5 shadow-raise transition-shadow",
        offline && "opacity-50",
        dragging && "opacity-50 shadow-inset-sm",
        dragOver && "ring-2 ring-sd-accent",
        editing && "cursor-grab",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          iconActive && !offline
            ? "text-sd-accent shadow-raise-sm"
            : "text-muted-foreground shadow-inset-sm",
        )}
      >
        {icon}
      </span>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{name}</div>
        {status && (
          <div
            className={cn(
              "mt-0.5 truncate text-[11.5px]",
              offline ? "text-sd-warn" : "text-muted-foreground",
            )}
          >
            {status}
          </div>
        )}
      </div>

      {/* コントロール領域: 幅 138px はモード間で不変。中身だけ差し替える。 */}
      {editing ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label={t("favorites.moveUp", { name })}
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="grid size-[30px] shrink-0 place-items-center rounded-[9px] text-muted-foreground shadow-raise-sm transition-colors hover:text-foreground active:shadow-inset-sm disabled:pointer-events-none disabled:opacity-35 disabled:shadow-inset-sm"
          >
            <ArrowUp size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={t("favorites.moveDown", { name })}
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="grid size-[30px] shrink-0 place-items-center rounded-[9px] text-muted-foreground shadow-raise-sm transition-colors hover:text-foreground active:shadow-inset-sm disabled:pointer-events-none disabled:opacity-35 disabled:shadow-inset-sm"
          >
            <ArrowDown size={15} strokeWidth={2} />
          </button>
          {/* ドラッグの掴みどころ（補助）。並び替えモードでのみ出す。 */}
          <span
            aria-hidden
            className="grid h-8 w-6 shrink-0 place-items-center text-muted-foreground"
          >
            <GripVertical size={16} strokeWidth={2} />
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-[30px_96px] items-center gap-3">
          <button
            type="button"
            aria-label={td("favoriteRemove", { name })}
            aria-pressed
            onClick={onUnfavorite}
            className="grid size-[30px] shrink-0 place-items-center rounded-[9px] text-sd-accent shadow-inset-sm"
          >
            <Pin size={15} strokeWidth={2} className="fill-current" />
          </button>
          <div className="flex items-center justify-end">{action}</div>
        </div>
      )}
    </div>
  );
}
