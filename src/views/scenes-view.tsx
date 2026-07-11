import { SceneRow } from "@/components/scene/scene-row";
import { ViewHeader } from "@/components/view-header";
import { useScenes } from "@/data";

export function ScenesView() {
  const { data, loading, error } = useScenes();

  return (
    <div>
      <ViewHeader title="シーン" subtitle="SwitchBot アプリで作成" />
      {loading && <p className="text-sm text-muted-foreground">読み込み中…</p>}
      {error && (
        <p className="text-sm text-destructive">シーンの取得に失敗しました。</p>
      )}
      {data && (
        <div className="flex flex-col gap-3">
          {data.map((scene) => (
            <SceneRow key={scene.id} scene={scene} />
          ))}
        </div>
      )}
    </div>
  );
}
