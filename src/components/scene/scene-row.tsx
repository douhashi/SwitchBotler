import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dataSource, type Scene } from "@/data";
import { SceneIcon } from "./scene-icon";

/** シーン 1 件の行（mockup .scene）。実行ボタンは実行中フィードバックを出す。 */
export function SceneRow({ scene }: { scene: Scene }) {
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      await dataSource.executeScene(scene.id);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex items-center gap-3.5 rounded-[15px] bg-card px-[15px] py-3.5 shadow-raise">
      <span className="grid size-[38px] shrink-0 place-items-center rounded-xl text-sd-accent shadow-raise-sm">
        <SceneIcon icon={scene.icon} size={19} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{scene.name}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
          {scene.description}
        </div>
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
