import { useEffect, useState } from "react";

import { dataSource, type Scene, type SensorReadings } from "@/data";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/** mount 時に 1 度だけ loader を呼ぶ軽量な読み取りフック。 */
function useAsync<T>(loader: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    loader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      active = false;
    };
    // mount 時に 1 度だけ実行する。loader は各フックで安定した参照を渡す前提。
  }, []);

  return state;
}

export function useScenes(): AsyncState<Scene[]> {
  return useAsync(() => dataSource.getScenes());
}

export function useSensors(): AsyncState<SensorReadings> {
  return useAsync(() => dataSource.getSensors());
}
