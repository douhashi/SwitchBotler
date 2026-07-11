/**
 * ビュー用ドメイン型（view-model）。
 *
 * SwitchBot API の生レスポンス形ではなく、画面が必要とする形として定義する。
 * API との対応付けは #8/#9 で追加する Tauri 実装（DataSource）側の責務とし、
 * ビュー・ストア・フックはこの view-model のみに依存する。
 */

/** アイコンと操作アフォーダンスを決めるデバイス種別。 */
export type DeviceCategory = "light" | "fan" | "curtain" | "humidifier" | "lock";

/** デバイスの可変状態。持つ制御は種別により異なる（任意プロパティ）。 */
export type DeviceControls = {
  /** 電源 ON/OFF。鍵の場合は施錠状態（true=施錠）。全デバイス共通。 */
  power: boolean;
  /** 明るさ 0-100（調光対応ライトのみ）。 */
  brightness?: number;
  /** 選択中カラー ID（カラー電球のみ。colorOptions と対応）。 */
  colorId?: string;
  /** 開度 0-100（カーテンのみ）。 */
  position?: number;
};

/** カラー電球のカラー候補。swatch は UI プレゼンテーション色。 */
export type DeviceColorOption = {
  id: string;
  label: string;
  swatch: string;
};

export type Device = {
  id: string;
  name: string;
  /** 製品モデル名（サブテキスト表示用。例: "Color Bulb"）。 */
  model: string;
  /** 設置場所（詳細ヘッダ用。例: "リビング"）。 */
  room: string;
  category: DeviceCategory;
  controls: DeviceControls;
  /** カラー電球のカラー候補。 */
  colorOptions?: DeviceColorOption[];
};

/** カード上の主操作。toggle=Switch を直接表示 / detail=詳細画面へ遷移。 */
export type DeviceInteraction = "toggle" | "detail";

/**
 * デバイスの主操作を導出する。
 * 明るさ・開度などの追加制御を持つデバイスと鍵は詳細画面（detail）へ、
 * 電源のみのデバイスはカード上の Switch（toggle）で操作する。
 */
export function deviceInteraction(device: Device): DeviceInteraction {
  const { brightness, position } = device.controls;
  if (device.category === "lock" || brightness !== undefined || position !== undefined) {
    return "detail";
  }
  return "toggle";
}

/** カード・ヘッダのサブに出す状態ラベルを導出する。 */
export function deviceStatusLabel(device: Device): string {
  const { power, position } = device.controls;
  switch (device.category) {
    case "lock":
      return power ? "施錠" : "解錠";
    case "curtain":
      return position === undefined ? (power ? "開" : "閉") : `${position}% 開`;
    case "light":
      return power ? "点灯中" : "オフ";
    default:
      return power ? "オン" : "オフ";
  }
}

/** シーンのアイコン種別。scene-row が lucide にマップする。 */
export type SceneIcon = "sleep" | "home" | "morning" | "movie";

export type Scene = {
  id: string;
  name: string;
  description: string;
  icon: SceneIcon;
};

/** センサー計測値の表示方式。 */
export type SensorDisplay = "sparkline" | "meter";

/** スパークライン／ラベルの配色トーン。 */
export type SensorTone = "accent" | "muted" | "ok";

/** ラベルアイコン種別。stat-card が lucide にマップする。 */
export type SensorIcon = "temperature" | "humidity" | "co2" | "battery";

export type SensorMetric = {
  id: string;
  label: string;
  icon: SensorIcon;
  value: number;
  unit: string;
  display: SensorDisplay;
  tone: SensorTone;
  /** 履歴系列（display=sparkline のみ）。 */
  history?: number[];
};

export type SensorReadings = {
  /** センサー名（例: "リビングの温湿度計"）。 */
  source: string;
  /** 最終更新の表示文字列（例: "21:04"）。 */
  updatedAt: string;
  metrics: SensorMetric[];
};

export type ConnectionStatus = "connected" | "disconnected" | "testing";

export type ConnectionState = {
  status: ConnectionStatus;
  /** 最終確認時刻の表示文字列。未確認なら null。 */
  lastCheckedAt: string | null;
  /** レート残と上限。 */
  rateRemaining: number;
  rateLimit: number;
  /** マスク済み Token 表示値（平文は保持しない）。 */
  tokenMasked: string;
  /** マスク済み Secret 表示値（平文は保持しない）。 */
  secretMasked: string;
};
