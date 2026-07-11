import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { shouldShowFade } from "./layout";

interface ScrollRegionProps {
  /** スクロール領域の最大高さ（論理px）。超過分のみ内側スクロールになる。 */
  maxHeight: number;
  /** 領域識別（テスト・デバッグ用）。スクロールコンテナ本体に付与する。 */
  "data-testid"?: string;
  children: ReactNode;
}

/**
 * 最大高さでクランプし、超過分を内側スクロールにする再利用領域。
 *
 * - `overflow-y-auto` + `overscroll-contain` で親ウィンドウへのスクロール伝播を止める（V2）。
 * - 続きがある（最下端に未到達）ときのみ下端フェードを出す（決定: 選択肢 B）。
 * - フェード層はスクロールしないラッパー側に絶対配置し、スクロール中も下端に固定する。
 */
export function ScrollRegion({
  maxHeight,
  children,
  "data-testid": testId,
}: ScrollRegionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [faded, setFaded] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFaded(shouldShowFade(el.scrollTop, el.clientHeight, el.scrollHeight));
  }, []);

  // 毎レンダー後に再判定する（お気に入り件数の増減を確実に反映する）。
  // setFaded は値が変わらなければ再レンダーを起こさないので無限ループしない。
  useEffect(update);

  // 要素サイズの変化（フォント読み込み・利用可能幅の変化等）でも再判定する。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        data-testid={testId}
        onScroll={update}
        style={{ maxHeight }}
        className="overflow-y-auto overscroll-contain scrollbar-soft"
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-[7px] bottom-0 left-0 h-5 bg-gradient-to-b from-transparent to-background transition-opacity",
          faded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
