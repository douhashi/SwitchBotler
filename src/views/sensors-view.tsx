import { StatCard } from "@/components/sensor/stat-card";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { useSensors } from "@/data";

export function SensorsView() {
  const { data, loading, error, refetch } = useSensors();
  const hasMetrics = !!data && data.metrics.length > 0;

  return (
    <div>
      <ViewHeader title="センサー" subtitle={hasMetrics ? data.source : undefined} />
      {loading && !data && <LoadingState />}
      {error && !data && <ErrorState message={error.message} onRetry={refetch} />}
      {data && !hasMetrics && (
        <EmptyState>センサー（温湿度計）が見つかりませんでした。</EmptyState>
      )}
      {hasMetrics && (
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
