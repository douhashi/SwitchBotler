import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Pin, Play, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dataSource, type Scene } from "@/data";
import { type AppErrorCode, errorCodeOf, statusCodeOf } from "@/i18n/error";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";

/** シーン実行失敗の一過性エラー（コード + apiStatus 補間用の番号）。 */
type SceneError = { code: AppErrorCode; statusCode?: number };

/**
 * シーン 1 件のカード（mockup .scene）。幅に応じた 3/2/1 列グリッドに載る。
 * SwitchBot API は sceneId/sceneName のみを返す（説明・アイコンは無い）ため、
 * 先頭アイコンは共通グリフ、本文はシーン名のみとする。
 * 実行ボタンは実行中フィードバックと失敗メッセージを出す。
 */
export function SceneRow({ scene }: { scene: Scene }) {
  const { t } = useTranslation("scenes");
  const { t: te } = useTranslation("errors");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<SceneError | null>(null);
  const favorite = useFavoritesStore((s) => s.sceneIds.includes(scene.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleSceneFavorite);

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
    <div className="flex flex-col gap-3 rounded-[15px] bg-card p-3.5 shadow-raise">
      <div className="flex items-start gap-3">
        <span className="grid size-[38px] shrink-0 place-items-center rounded-xl text-sd-accent shadow-raise-sm">
          <Layers size={19} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{scene.name}</div>
          {error && (
            <div className="mt-0.5 text-[11.5px] text-destructive">
              {te(error.code, { statusCode: error.statusCode })}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label={
            favorite
              ? t("favoriteRemove", { name: scene.name })
              : t("favoriteAdd", { name: scene.name })
          }
          aria-pressed={favorite}
          onClick={() => toggleFavorite(scene.id)}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
            favorite
              ? "text-sd-accent shadow-inset-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Pin size={15} strokeWidth={2} className={cn(favorite && "fill-current")} />
        </button>
      </div>
      <Button size="sm" onClick={run} disabled={running} className="w-full">
        {running ? (
          <RefreshCw className="animate-spin" strokeWidth={2} />
        ) : (
          <Play strokeWidth={2} />
        )}
        {running ? t("running") : t("run")}
      </Button>
    </div>
  );
}
