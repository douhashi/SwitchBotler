import { Activity, Layers, LayoutGrid, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";

import type { ViewId } from "@/stores/navigation-store";
import { DevicesView } from "./devices-view";
import { ScenesView } from "./scenes-view";
import { SensorsView } from "./sensors-view";
import { SettingsView } from "./settings-view";

/**
 * 画面メタ情報の SSoT。サイドバーのナビ（icon）と画面本体（render）が同じ定義を参照する。
 * ナビラベルは `id` をキーに `common:nav.<id>` を翻訳する（サイドバー側）。各画面の
 * タイトル・サブタイトルは各 view の ViewHeader が持つ。
 */
export type ViewMeta = {
  id: ViewId;
  icon: LucideIcon;
  render: () => ReactElement;
};

export const VIEWS: ViewMeta[] = [
  {
    id: "devices",
    icon: LayoutGrid,
    render: () => <DevicesView />,
  },
  {
    id: "sensors",
    icon: Activity,
    render: () => <SensorsView />,
  },
  {
    id: "scenes",
    icon: Layers,
    render: () => <ScenesView />,
  },
  {
    id: "settings",
    icon: Settings,
    render: () => <SettingsView />,
  },
];

const VIEW_MAP = new Map<ViewId, ViewMeta>(VIEWS.map((v) => [v.id, v]));

export function getView(id: ViewId): ViewMeta {
  const view = VIEW_MAP.get(id);
  if (!view) throw new Error(`Unknown view: ${id}`);
  return view;
}
