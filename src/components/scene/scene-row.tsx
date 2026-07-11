import { useState } from "react";
import { Layers, Play, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dataSource, type Scene } from "@/data";

/**
 * シーン 1 件の行（mockup .scene）。
 * SwitchBot API は sceneId/sceneName のみを返す（説明・アイコンは無い）ため、
 * 先頭アイコンは共通グリフ、本文はシーン名のみとする。
 * 実行ボタンは実行中フィードバックと失敗メッセージを出す。
 */
export function SceneRow({ scene }: { scene: Scene }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      await dataSource.executeScene(scene.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "シーンの実行に失敗しました。");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex items-center gap-3.5 rounded-[15px] bg-card px-[15px] py-3.5 shadow-raise">
      <span className="grid size-[38px] shrink-0 place-items-center rounded-xl text-sd-accent shadow-raise-sm">
        <Layers size={19} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{scene.name}</div>
        {error && (
          <div className="mt-0.5 text-[11.5px] text-destructive">{error}</div>
        )}
      </div>
      <Button size="sm" onClick={run} disabled={running}>
        {running ? (
          <RefreshCw className="animate-spin" strokeWidth={2} />
        ) : (
          <Play strokeWidth={2} />
        )}
        {running ? "実行中" : "実行"}
      </Button>
    </div>
  );
}
