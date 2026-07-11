import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import { applyTheme, useThemeStore } from "./stores/theme-store";

// 描画前にテーマを適用して FOUC（初回のちらつき）を防ぐ。
applyTheme(useThemeStore.getState().theme);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
