import { SceneRow } from "@/components/scene/scene-row";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { useScenes } from "@/data";

export function ScenesView() {
  const { data, loading, error, refetch } = useScenes();

  return (
    <div>
      <ViewHeader title="シーン" subtitle="SwitchBot アプリで作成" />
      {loading && !data && <LoadingState />}
      {error && !data && <ErrorState message={error.message} onRetry={refetch} />}
      {data && data.length === 0 && (
        <EmptyState>シーンがまだありません。</EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="grid-cards">
          {data.map((scene) => (
            <SceneRow key={scene.id} scene={scene} />
          ))}
        </div>
      )}
    </div>
  );
}
