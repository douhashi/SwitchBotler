import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 並び替えモードのコントロール（カードの操作系と入れ替わる）。
 *
 * ↑↓ が**主操作**。ドラッグはポインタ用の補助でしかないので、キーボードで並び替えられる
 * この経路を必ず用意する（ドラッグ&ドロップにはキーボード代替が要る）。端では disabled。
 * このモードは**並び替えだけ**を担う（登録・解除は持ち込まない）。
 */
export function ReorderControls({
  name,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation("common");

  const btn =
    "grid size-[30px] shrink-0 place-items-center rounded-[9px] text-muted-foreground shadow-raise-sm transition-colors hover:text-foreground active:shadow-inset-sm disabled:pointer-events-none disabled:opacity-35 disabled:shadow-inset-sm";

  return (
    <>
      <button
        type="button"
        aria-label={t("favorites.moveUp", { name })}
        disabled={!canMoveUp}
        onClick={onMoveUp}
        className={btn}
      >
        <ArrowUp size={15} strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label={t("favorites.moveDown", { name })}
        disabled={!canMoveDown}
        onClick={onMoveDown}
        className={btn}
      >
        <ArrowDown size={15} strokeWidth={2} />
      </button>
      {/* ドラッグの掴みどころ（補助）。並び替えモードでのみ出す。 */}
      <span aria-hidden className="grid h-8 w-5 place-items-center text-muted-foreground">
        <GripVertical size={16} strokeWidth={2} />
      </span>
    </>
  );
}
