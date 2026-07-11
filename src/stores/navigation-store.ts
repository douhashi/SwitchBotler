import { create } from "zustand";

/** 画面遷移は react-router を導入せず view-state で管理する（PO 確定）。 */
export type ViewId = "devices" | "sensors" | "scenes" | "settings";

type NavigationState = {
  activeView: ViewId;
  /** デバイス詳細操作に遷移した際の対象デバイス。未選択時は null。 */
  selectedDeviceId: string | null;
  navigate: (view: ViewId, deviceId?: string) => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  activeView: "devices",
  selectedDeviceId: null,
  navigate: (view, deviceId) =>
    set({ activeView: view, selectedDeviceId: deviceId ?? null }),
}));
