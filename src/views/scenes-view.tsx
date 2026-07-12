import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { FavoritesBoard } from "@/components/favorites/favorites-board";
import { SceneRow } from "@/components/scene/scene-row";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { useScenes } from "@/data";
import { errorCodeOf, statusCodeOf } from "@/i18n/error";
import { useFavoritesStore } from "@/stores/favorites-store";

export function ScenesView() {
  const { t } = useTranslation("scenes");
  const { data, loading, error, refetch } = useScenes();
  const favoriteIds = useFavoritesStore((s) => s.sceneIds);
  const loadFavorites = useFavoritesStore((s) => s.load);
  const place = useFavoritesStore((s) => s.placeSceneFavorite);
  const remove = useFavoritesStore((s) => s.removeSceneFavorite);
  const toggle = useFavoritesStore((s) => s.toggleSceneFavorite);
  const move = useFavoritesStore((s) => s.moveSceneFavorite);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <div>
      <ViewHeader title={t("title")} subtitle={t("subtitle")} />
      {loading && !data && <LoadingState />}
      {error && !data && (
        <ErrorState
          code={errorCodeOf(error)}
          statusCode={statusCodeOf(error)}
          onRetry={refetch}
        />
      )}
      {data && data.length === 0 && <EmptyState>{t("empty")}</EmptyState>}
      {data && (
        // デバイスとまったく同じ操作モデル（ドラッグして移す・落とした位置が並び順）。
        <FavoritesBoard
          items={data}
          favoritesTitle={t("favorites")}
          restTitle={t("all")}
          favoriteIds={favoriteIds}
          place={place}
          remove={remove}
          toggle={toggle}
          move={move}
          renderRow={(scene, props) => <SceneRow scene={scene} {...props} />}
        />
      )}
    </div>
  );
}
