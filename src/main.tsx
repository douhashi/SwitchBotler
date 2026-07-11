import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";

import App from "./App";
import { TrayApp } from "./components/tray/tray-app";
import "./index.css";
import { applyTheme, useThemeStore } from "./stores/theme-store";

// 描画前にテーマを適用して FOUC（初回のちらつき）を防ぐ。
applyTheme(useThemeStore.getState().theme);

// ウィンドウ label で描画するルートを分岐する（トレイポップアップは別ウィンドウ）。
const isTray = getCurrentWindow().label === "tray";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isTray ? <TrayApp /> : <App />}</React.StrictMode>,
);
