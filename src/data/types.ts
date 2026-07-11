/**
 * ビュー用ドメイン型（view-model）。
 *
 * SwitchBot API の生レスポンス形ではなく、画面が必要とする形として定義する。
 * API との対応付け（生 JSON → この view-model）は Rust 側 `mapping.rs` の責務とし、
 * ビュー・ストア・フックはこの view-model のみに依存する（決定1）。
 */

/**
 * アイコンと操作アフォーダンスを決めるデバイス種別。
 * `other` は未対応種別（読み取り表示のみ。決定4）。
 */
export type DeviceCategory =
  | "light"
  | "plug"
  | "curtain"
  | "humidifier"
  | "lock"
  | "bot"
  | "other";

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
  /** 製品モデル名（= deviceType。サブテキスト表示用。例: "Color Bulb"）。 */
  model: string;
  category: DeviceCategory;
  /** 操作対応済みの既知種別か。false なら「未対応」読み取り表示にする（決定4）。 */
  supported: boolean;
  controls: DeviceControls;
  /** カラー電球のカラー候補。 */
  colorOptions?: DeviceColorOption[];
};

/**
 * カード上の主操作。
 * - toggle: Switch を直接表示
 * - detail: 詳細画面へ遷移
 * - none: 未対応（操作なし・読み取り表示）
 */
export type DeviceInteraction = "toggle" | "detail" | "none";

/**
 * デバイスの主操作を導出する。
 * 未対応種別は操作なし。明るさ・開度などの追加制御を持つデバイスと鍵は詳細画面へ、
 * 電源のみのデバイスはカード上の Switch で操作する。
 */
export function deviceInteraction(device: Device): DeviceInteraction {
  if (!device.supported) return "none";
  const { brightness, position } = device.controls;
  if (device.category === "lock" || brightness !== undefined || position !== undefined) {
    return "detail";
  }
  return "toggle";
}

/** カード・ヘッダのサブに出す状態ラベルを導出する。 */
export function deviceStatusLabel(device: Device): string {
  if (!device.supported) return "未対応";
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

/**
 * 電源トグル（turnOn/turnOff・鍵は lock/unlock）で操作できるカテゴリか。
 * カーテンは開度操作（setPosition）のみで電源トグルを持たない。
 */
export function hasPowerToggle(device: Device): boolean {
  return device.supported && device.category !== "curtain";
}

/**
 * シーン。SwitchBot API は sceneId/sceneName のみを返す（説明・アイコンは無い）ため、
 * view-model も id と name のみを持つ。
 */
export type Scene = {
  id: string;
  name: string;
};

/** ラベルアイコン種別。stat-card が lucide にマップする。 */
export type SensorIcon = "temperature" | "humidity" | "battery";

/**
 * センサー計測値 1 項目。
 * API は単一時点値のみを返すため履歴は持たず、全項目をメーター表示する（決定3）。
 */
export type SensorMetric = {
  id: string;
  label: string;
  icon: SensorIcon;
  value: number;
  unit: string;
};

export type SensorReadings = {
  /** センサー名（例: "リビングの温湿度計"）。センサー無しなら空文字。 */
  source: string;
  /** 最終更新の表示文字列（例: "21:04"）。 */
  updatedAt: string;
  metrics: SensorMetric[];
};

export type ConnectionStatus = "connected" | "disconnected" | "testing";

/**
 * 接続状態の view-model。
 *
 * 秘匿値（Token / Secret / 署名）は一切持たない。保存済みかどうかは真偽フラグ
 * `saved` のみで表し、UI は保存済みなら固定マスク + バッジで表示する。
 */
export type ConnectionState = {
  status: ConnectionStatus;
  /** 最終確認時刻の表示文字列。未確認なら null。 */
  lastCheckedAt: string | null;
  /** keyring に Token / Secret が保存されているか。 */
  saved: boolean;
  /**
   * 1 日あたりのリクエスト上限（静的補足表示用）。
   * 公式 v1.1 に「残数」フィールドは存在しないため残数は扱わない。
   */
  rateLimit: number;
};

/** SwitchBot API v1.1 の 1 日あたりリクエスト上限（静的表示用）。 */
export const RATE_LIMIT = 10000;
