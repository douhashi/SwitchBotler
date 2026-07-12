import { useState } from "react";
import type { DragEvent, HTMLAttributes } from "react";

/** カードへ spread する props（`data-fav-id` で行を特定してドロップ位置を求める）。 */
type CardDragProps = HTMLAttributes<HTMLElement> & {
  draggable?: boolean;
  "data-fav-id"?: string;
};

/**
 * お気に入り＝ドロップ先、という操作モデルのドラッグ統括。
 *
 * - お気に入りへ落とす → **登録**（未登録なら）＋ **落とした位置が並び順**
 * - お気に入りの中で落とす → **並び替え**（同じ操作）
 * - お気に入りの外へ落とす → **解除**
 *
 * ピンのようなボタンを持たないため、カードのコントロール枠は常にひとつで済む。
 * ドラッグはポインタ専用の経路なので、**キーボード代替**（並び替え＝↑↓、登録/解除＝
 * コンテキストメニュー）を必ず併設すること。
 */
export function useFavoritesDnd({
  favoriteIds,
  onPlace,
  onRemove,
}: {
  /** 現在のお気に入り順。 */
  favoriteIds: string[];
  /** `index`（その id を除いた並びでの挿入位置）へ置く。登録も並び替えもこれ 1 本。 */
  onPlace: (id: string, index: number) => void;
  onRemove: (id: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  /** お気に入り内での挿入位置（ドロップ線の表示に使う）。null なら非表示。 */
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [overRemove, setOverRemove] = useState(false);

  const reset = () => {
    setDraggingId(null);
    setInsertAt(null);
    setOverRemove(false);
  };

  /**
   * ドロップ先ゾーン内の行から、`draggingId` を除いた並びにおける挿入位置を求める。
   * 自分自身を数えないので、リスト内での移動でも位置がズレない。
   */
  const indexAt = (zone: HTMLElement, clientY: number): number => {
    const rows = Array.from(zone.querySelectorAll<HTMLElement>("[data-fav-id]"));
    let index = 0;
    for (const row of rows) {
      if (row.dataset.favId === draggingId) continue;
      const rect = row.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) break;
      index += 1;
    }
    return index;
  };

  /** 各カードへ spread する。`data-no-drag` の上からはドラッグを開始しない。 */
  const cardProps = (id: string): CardDragProps => ({
    draggable: true,
    "data-fav-id": id,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      // トグルや「押す」の上から掴んでしまう事故を防ぐ。
      if ((e.target as HTMLElement).closest("[data-no-drag]")) {
        e.preventDefault();
        return;
      }
      setDraggingId(id);
      // setData を呼ばないと WebKit ではドラッグが開始されない（必須）。
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: reset,
  });

  /** お気に入りセクション（ドロップ先）へ spread する。 */
  const favoritesZoneProps: HTMLAttributes<HTMLElement> = {
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!draggingId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOverRemove(false);
      setInsertAt(indexAt(e.currentTarget, e.clientY));
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setInsertAt(null);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (!draggingId) return;
      e.preventDefault();
      onPlace(draggingId, indexAt(e.currentTarget, e.clientY));
      reset();
    },
  };

  /** 「その他」セクション（お気に入りから外すドロップ先）へ spread する。 */
  const removeZoneProps: HTMLAttributes<HTMLElement> = {
    onDragOver: (e: DragEvent<HTMLElement>) => {
      // お気に入りに入っているものだけが「外す」対象になる。
      if (!draggingId || !favoriteIds.includes(draggingId)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setInsertAt(null);
      setOverRemove(true);
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverRemove(false);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (!draggingId || !favoriteIds.includes(draggingId)) return;
      e.preventDefault();
      onRemove(draggingId);
      reset();
    },
  };

  return {
    draggingId,
    insertAt,
    overRemove,
    cardProps,
    favoritesZoneProps,
    removeZoneProps,
  };
}
