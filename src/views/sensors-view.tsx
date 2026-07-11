import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

import { StatCard } from "@/components/sensor/stat-card";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { useSensors } from "@/data";
import { loadSensorOrder, saveSensorOrder } from "@/data/preferences";
import { cn } from "@/lib/utils";
import type { SensorReadings } from "@/data";

/**
 * 保存済みの並べ替え順に従ってセンサーを整列する。
 * 保存順に含まれ現存する id を先頭に、保存順に無い新規センサーは元の順序で末尾に足す。
 */
function orderSensors(items: SensorReadings[], order: string[]): SensorReadings[] {
  const byId = new Map(items.map((s) => [s.id, s]));
  const result: SensorReadings[] = [];
  for (const id of order) {
    const s = byId.get(id);
    if (s) {
      result.push(s);
      byId.delete(id);
    }
  }
  for (const s of byId.values()) result.push(s);
  return result;
}

export function SensorsView() {
  const { data, loading, error, refetch } = useSensors();
  const [order, setOrder] = useState<string[]>([]);
  const dragIndex = useRef<number | null>(null);

  // 保存済みの並べ替え順を初回に読み込む。
  useEffect(() => {
    loadSensorOrder()
      .then(setOrder)
      .catch(() => {});
  }, []);

  const sensors = useMemo(() => orderSensors(data ?? [], order), [data, order]);
  const hasSensors = sensors.length > 0;

  /** 新しい並び順を state に反映し永続化する。 */
  const applyOrder = (ids: string[]) => {
    setOrder(ids);
    void saveSensorOrder(ids).catch(() => {});
  };

  /** i 番目を dir（-1: 上 / +1: 下）方向へ 1 つ動かす（キーボード操作用）。 */
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sensors.length) return;
    const ids = sensors.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    applyOrder(ids);
  };

  const onDrop = (target: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;
    const ids = sensors.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(target, 0, moved);
    applyOrder(ids);
  };

  return (
    <div>
      <ViewHeader title="センサー" subtitle="温湿度計・人感センサー" />
      {loading && !data && <LoadingState />}
      {error && !data && <ErrorState message={error.message} onRetry={refetch} />}
      {data && !hasSensors && (
        <EmptyState>
          センサー（温湿度計・人感センサー）が見つかりませんでした。
        </EmptyState>
      )}

      {hasSensors &&
        sensors.map((sensor, i) => (
          <section
            key={sensor.id}
            draggable
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            className="mb-5"
          >
            <div className="mb-2.5 flex items-center gap-2 px-0.5">
              <span
                aria-hidden
                className="grid size-[26px] shrink-0 cursor-grab place-items-center rounded-lg text-muted-foreground shadow-raise-sm active:cursor-grabbing"
              >
                <GripVertical size={16} strokeWidth={1.9} />
              </span>
              <h2 className="truncate text-sm font-semibold tracking-tight">
                {sensor.source || "センサー"}
              </h2>
              <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                最終更新 {sensor.updatedAt}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`${sensor.source || "センサー"} を上へ`}
                  className={cn(
                    "grid size-7 place-items-center rounded-lg text-muted-foreground shadow-raise-sm transition-colors hover:text-foreground active:shadow-inset-sm disabled:opacity-40 disabled:shadow-none",
                  )}
                >
                  <ArrowUp size={15} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === sensors.length - 1}
                  aria-label={`${sensor.source || "センサー"} を下へ`}
                  className={cn(
                    "grid size-7 place-items-center rounded-lg text-muted-foreground shadow-raise-sm transition-colors hover:text-foreground active:shadow-inset-sm disabled:opacity-40 disabled:shadow-none",
                  )}
                >
                  <ArrowDown size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="grid-cards">
              {sensor.metrics.map((metric) => (
                <StatCard key={metric.id} metric={metric} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
