import { useCallback, useEffect, useState } from "react";

import { dataSource, type Scene, type SensorReadings } from "@/data";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export type AsyncResult<T> = AsyncState<T> & {
  /** 手動で再取得する。 */
  refetch: () => void;
};

/** センサー画面のポーリング間隔（ms）。レート節約のため固定 60 秒（可視時のみ）。 */
const SENSOR_POLL_MS = 60_000;

/**
 * 読み取り主体データの取得フック。mount 時に取得し、手動 refetch を提供する。
 * loader は呼び出し側で `useCallback` により安定参照を渡す前提。
 */
function useAsync<T>(loader: () => Promise<T>): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const run = useCallback(() => {
    let cancelled = false;
    // 初回はローディング表示、再取得（データ既存）時は無音更新にしてちらつきを防ぐ。
    setState((s) => ({ ...s, loading: s.data === null }));
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loader]);

  useEffect(() => run(), [run]);

  return { ...state, refetch: run };
}

export function useScenes(): AsyncResult<Scene[]> {
  const loader = useCallback(() => dataSource.getScenes(), []);
  return useAsync(loader);
}

export function useSensors(): AsyncResult<SensorReadings[]> {
  const loader = useCallback(() => dataSource.getSensors(), []);
  const result = useAsync(loader);
  const { refetch } = result;

  // 可視 & フォーカス時のみ 60 秒間隔でポーリングする（非表示時は停止）。
  // 全デバイス背景ポーリングはせず、センサー画面に限定する（ポーリング設計）。
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    const start = () => {
      stop();
      timer = setInterval(() => {
        if (document.visibilityState === "visible" && document.hasFocus()) {
          refetch();
        }
      }, SENSOR_POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetch();
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState === "visible") start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  return result;
}
