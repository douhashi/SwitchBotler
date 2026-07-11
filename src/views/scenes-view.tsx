import { useTranslation } from "react-i18next";

import { SceneRow } from "@/components/scene/scene-row";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { useScenes } from "@/data";
import { errorCodeOf, statusCodeOf } from "@/i18n/error";

export function ScenesView() {
  const { t } = useTranslation("scenes");
  const { data, loading, error, refetch } = useScenes();

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
      {data && data.length === 0 && (
        <EmptyState>{t("empty")}</EmptyState>
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
