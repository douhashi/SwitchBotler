import { useState } from "react";
import type { DragEvent, HTMLAttributes } from "react";

import type { ReorderPlace } from "@/stores/favorites-store";

/**
 * お気に入り行のドラッグ並び替え（HTML5 DnD）。
 *
 * ドラッグは**補助**手段で、キーボードでも操作できる ↑↓ ボタンが主操作
 * （ジェスチャ単独に依存しない / ドラッグにはキーボード代替を必ず用意する）。
 * 有効化は並び替えモードのときだけにし、普段の誤ドラッグを防ぐ。
 */
export function useDragReorder(
  onReorder: (id: string, targetId: string, place: ReorderPlace) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reset = () => {
    setDraggingId(null);
    setOverId(null);
  };

  /** 行へ spread する DnD ハンドラ群。`enabled=false` なら何も付けない。 */
  const rowProps = (
    id: string,
    enabled: boolean,
  ): HTMLAttributes<HTMLElement> & { draggable?: boolean } => {
    if (!enabled) return {};
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setDraggingId(id);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragEnd: reset,
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        if (id !== draggingId) setOverId(id);
      },
      onDragLeave: () => setOverId((current) => (current === id ? null : current)),
      onDrop: (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        if (draggingId && draggingId !== id) {
          // 行の上半分に落としたら前、下半分なら後ろへ入れる。
          const rect = e.currentTarget.getBoundingClientRect();
          const place: ReorderPlace =
            e.clientY > rect.top + rect.height / 2 ? "after" : "before";
          onReorder(draggingId, id, place);
        }
        reset();
      },
    };
  };

  return { draggingId, overId, rowProps };
}
