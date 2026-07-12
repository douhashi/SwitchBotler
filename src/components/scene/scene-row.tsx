import { type ComponentPropsWithRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Play, RefreshCw } from "lucide-react";

import type { FavoriteRowProps } from "@/components/favorites/favorites-board";
import { Button } from "@/components/ui/button";
import { dataSource, type Scene } from "@/data";
import { type AppErrorCode, errorCodeOf, statusCodeOf } from "@/i18n/error";
import { cn } from "@/lib/utils";

/** シーン実行失敗の一過性エラー（コード + apiStatus 補間用の番号）。 */
type SceneError = { code: AppErrorCode; statusCode?: number };

/**
 * シーン 1 件の行。デバイスカードと同じ形（アイコン・名前・右にコントロール 1 つ）にする。
 *
 * **ピン（お気に入りボタン）は持たない。** お気に入りは「セクション（ドロップ先）」であり、
 * 登録はカードを**ドラッグして移す**ことで行う（非ドラッグ経路はコンテキストメニュー）。
 * SwitchBot API は sceneId/sceneName のみを返す（説明・アイコンは無い）ため、
 * 先頭アイコンは共通グリフ、本文はシーン名のみとする。
 */
export function SceneRow({
  scene,
  control,
  dragProps,
  dragging,
  label,
  ...rest
}: { scene: Scene } & Partial<FavoriteRowProps> & ComponentPropsWithRef<"div">) {
  const { t } = useTranslation("scenes");
  const { t: te } = useTranslation("errors");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<SceneError | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      await dataSource.executeScene(scene.id);
    } catch (e) {
      setError({ code: errorCodeOf(e), statusCode: statusCodeOf(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      role="listitem"
      aria-label={label ?? scene.name}
      {...rest}
      {...dragProps}
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-raise transition-shadow",
        dragProps?.draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-45 shadow-inset-sm",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sd-accent shadow-raise-sm">
        <Layers size={20} strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {scene.name}
        </div>
        {error && (
          <div className="mt-0.5 truncate text-[11.5px] text-destructive">
            {te(error.code, { statusCode: error.statusCode })}
          </div>
        )}
      </div>

      {/* コントロール枠は常にひとつ。通常は「実行」、並び替え中は ↑↓ に入れ替わる。
          data-no-drag: この上からはドラッグを開始しない（押すつもりが掴む事故を防ぐ）。 */}
      <div data-no-drag className="flex shrink-0 items-center gap-2">
        {control ?? (
          <Button size="sm" onClick={run} disabled={running}>
            {running ? (
              <RefreshCw className="animate-spin" strokeWidth={2} />
            ) : (
              <Play strokeWidth={2} />
            )}
            {running ? t("running") : t("run")}
          </Button>
        )}
      </div>
    </div>
  );
}
