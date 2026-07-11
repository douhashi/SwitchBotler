import { StatCard } from "@/components/sensor/stat-card";
import { ViewHeader } from "@/components/view-header";
import { useSensors } from "@/data";

export function SensorsView() {
  const { data, loading, error } = useSensors();

  return (
    <div>
      <ViewHeader title="センサー" subtitle={data?.source} />
      {loading && (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">センサー情報の取得に失敗しました。</p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {data.metrics.map((metric) => (
              <StatCard key={metric.id} metric={metric} />
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            最終更新 {data.updatedAt}
          </p>
        </>
      )}
    </div>
  );
}
