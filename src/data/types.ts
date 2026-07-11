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
  | "aircon"
  | "ir_light"
  | "other";

/**
 * 赤外線ライトの操作 action（意味論。SwitchBot コマンド名への変換は Rust が所有）。
 * Light は絶対的な明るさ・状態を持たず、電源と相対的な明暗のみを扱う（公式 README）。
 */
export type IrLightAction = "on" | "off" | "brighter" | "dimmer";

/**
 * Bot の動作モード（status の deviceMode 由来）。
 * - press: 押すボタン（1 回押して離す momentary 操作）
 * - switch: ON/OFF トグル（turnOn/turnOff）
 * - customize: ユーザ定義。既存 ON/OFF トグルを流用（公式準拠・ハードウェア未検証）
 */
export type BotMode = "press" | "switch" | "customize";

/** エアコンの運転モード（意味論。数値エンコードは Rust が所有・決定1）。 */
export type AirconMode = "auto" | "cool" | "dry" | "fan" | "heat";
/** エアコンの風量（意味論。数値エンコードは Rust が所有・決定1）。 */
export type AirconFanSpeed = "auto" | "low" | "medium" | "high";

/** エアコン設定温度の下限・上限（機種別レンジ検出はしない・固定）。 */
export const AIRCON_TEMP_MIN = 16;
export const AIRCON_TEMP_MAX = 30;

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
  /** 設定温度 ℃（エアコンのみ）。 */
  temperature?: number;
  /** 運転モード（エアコンのみ）。 */
  mode?: AirconMode;
  /** 風量（エアコンのみ）。 */
  fanSpeed?: AirconFanSpeed;
  /** Bot の動作モード（Bot のみ。status の deviceMode 由来）。 */
  botMode?: BotMode;
};

/**
 * エアコンの送信状態（setAll の全パラメータ）。赤外線は状態を返さないため、
 * これが「最後に送信した値」として永続化・表示の唯一のソースになる。
 */
export type AirconState = {
  power: boolean;
  temperature: number;
  mode: AirconMode;
  fanSpeed: AirconFanSpeed;
};

/**
 * 赤外線ライトの送信状態。赤外線は状態を返さず明るさも絶対値を持たないため、
 * 永続化・表示のソースは「最後に送信した電源値」のみ（明暗の増減は永続化しない）。
 */
export type IrLightState = {
  power: boolean;
};

/**
 * UI 表示ラベルを翻訳するための最小の翻訳関数型。
 * コンポーネントの `useTranslation(ns).t` をそのまま渡せる（i18n 知識はフロントに集約）。
 */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * カラー電球のカラー候補。swatch は UI プレゼンテーション色。
 * 表示名は安定 `id`（warm/neutral/… ）からフロントが翻訳する（Rust は日本語ラベルを返さない）。
 */
export type DeviceColorOption = {
  id: string;
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
 * - press: 「押す」ボタンを表示（Bot の pressMode。momentary 操作）
 * - detail: 詳細画面へ遷移
 * - none: 未対応（操作なし・読み取り表示）
 */
export type DeviceInteraction = "toggle" | "press" | "detail" | "none";

/**
 * デバイスの主操作を導出する。
 * 未対応種別は操作なし。明るさ・開度などの追加制御を持つデバイスと鍵は詳細画面へ、
 * pressMode の Bot は「押す」ボタン、それ以外の電源のみのデバイスはカード上の Switch で操作する。
 */
export function deviceInteraction(device: Device): DeviceInteraction {
  if (!device.supported) return "none";
  const { brightness, position, botMode } = device.controls;
  // pressMode の Bot は状態を持たない momentary 操作なので「押す」ボタン。
  // switch/customize/未定義の Bot は従来どおり電源トグル。
  if (device.category === "bot" && botMode === "press") {
    return "press";
  }
  if (
    device.category === "lock" ||
    device.category === "aircon" ||
    device.category === "ir_light" ||
    brightness !== undefined ||
    position !== undefined
  ) {
    return "detail";
  }
  return "toggle";
}

/**
 * 操作もセンサー読み取りもできない「その他」デバイスか（ハブ類・操作未対応の
 * 赤外線リモコン等）。センサーは `list_devices` で一覧から除外済みのため、
 * 一覧の非操作デバイスはこの述語（操作アフォーダンスなし）で一意に判別できる。
 */
export function isOtherDevice(device: Device): boolean {
  return deviceInteraction(device) === "none";
}

/** 運転モードの表示ラベルを引く（`devices` namespace の翻訳関数を渡す）。 */
export function airconModeLabel(mode: AirconMode, t: Translate): string {
  return t(`airconMode.${mode}`);
}

/** 風量の表示ラベルを引く（`devices` namespace の翻訳関数を渡す）。 */
export function airconFanLabel(fan: AirconFanSpeed, t: Translate): string {
  return t(`airconFan.${fan}`);
}

/**
 * カード・ヘッダのサブに出す状態ラベルを導出する（`devices` namespace の翻訳関数を渡す）。
 * 文言そのものは翻訳リソースに集約し、ここは種別ごとのキー選択と補間だけを担う。
 */
export function deviceStatusLabel(device: Device, t: Translate): string {
  if (!device.supported) return t("status.unsupported");
  const { power, position, temperature, mode, botMode } = device.controls;
  switch (device.category) {
    case "bot":
      // pressMode は ON/OFF 状態を持たないため中立ラベル。switch/customize は従来の「オン/オフ」。
      if (botMode === "press") return t("status.botPress");
      return power ? t("status.botOn") : t("status.botOff");
    case "lock":
      return power ? t("status.lockLocked") : t("status.lockUnlocked");
    case "curtain":
      return position === undefined
        ? power
          ? t("status.curtainOpen")
          : t("status.curtainClosed")
        : t("status.curtainPosition", { position });
    case "light":
      return power ? t("status.lightOn") : t("status.lightOff");
    case "ir_light":
      // 赤外線ライトは状態を返さないため「最後に送信した電源値」を点灯/消灯で表示する。
      return power ? t("status.irLightOn") : t("status.irLightOff");
    case "aircon":
      if (!power) return t("status.airconOff");
      // 運転中は「冷房 26℃」のように現在のモードと温度を出す。
      return mode !== undefined && temperature !== undefined
        ? t("status.airconRunning", { mode: airconModeLabel(mode, t), temperature })
        : t("status.airconOn");
    default:
      return power ? t("status.defaultOn") : t("status.defaultOff");
  }
}

/**
 * 電源トグル（turnOn/turnOff・鍵は lock/unlock）で操作できるカテゴリか。
 * カーテンは開度操作（setPosition）のみ、エアコンは詳細内で電源を含む全状態を
 * setAll 送信、赤外線ライトは詳細内で電源・明暗を個別 action 送信、pressMode の Bot は
 * ON/OFF 状態を持たず「押す」momentary 操作のため、いずれもカード/ヘッダの電源トグルを持たない。
 */
export function hasPowerToggle(device: Device): boolean {
  return (
    device.supported &&
    device.category !== "curtain" &&
    device.category !== "aircon" &&
    device.category !== "ir_light" &&
    !(device.category === "bot" && device.controls.botMode === "press")
  );
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
export type SensorIcon =
  | "temperature"
  | "humidity"
  | "battery"
  | "motion"
  | "brightness";

/**
 * すべての計測が共通で持つメタ。Rust `SensorMetricDto` と camelCase で 1:1 対応。
 * 表示ラベルは Rust から受け取らず、フロントが `icon` から翻訳する（i18n）。
 */
type SensorMetricBase = {
  id: string;
  icon: SensorIcon;
};

/**
 * 数値メーター表現の計測（温度/湿度/電池）。0-100 メーターと大数値で描画する。
 * API は単一時点値のみを返すため履歴は持たない（決定3）。
 */
export type GaugeMetric = SensorMetricBase & {
  kind: "gauge";
  value: number;
  unit: string;
};

/**
 * 状態表示の計測（人感/明るさ）。区分テキストを表示しメーターは持たない。
 * `state` は安定な状態キー（motion: "active"/"idle"、brightness: "bright"/"dim"）で、
 * フロントが `sensors:state.<icon>.<state>` から区分テキストを翻訳する。
 * `tone` は強調区分（active=起きている状態を sd-accent 強調 / idle=静穏 / 無指定=ニュートラル）。
 */
export type StateMetric = SensorMetricBase & {
  kind: "state";
  state: string;
  tone?: "active" | "idle";
};

/** センサー計測値 1 項目。`kind` で数値メーターと状態表示を判別する。 */
export type SensorMetric = GaugeMetric | StateMetric;

export type SensorReadings = {
  /** センサーの deviceId。セクションの key と並べ替え順の永続化に使う。 */
  id: string;
  /** センサー名（例: "リビングの温湿度計"）。 */
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
