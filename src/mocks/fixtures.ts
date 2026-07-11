import type { Device, DeviceColorOption, Scene, SensorReadings } from "@/data/types";

/** カラー電球のカラー候補（mockup 02 のスウォッチ行）。swatch は表示色。 */
const BULB_COLORS: DeviceColorOption[] = [
  { id: "warm", label: "電球色", swatch: "#F6D488" },
  { id: "neutral", label: "昼白色", swatch: "#FDF6E3" },
  { id: "cool", label: "昼光色", swatch: "#8FB7FF" },
  { id: "red", label: "レッド", swatch: "#F58A8A" },
  { id: "green", label: "グリーン", swatch: "#8CE0B0" },
  { id: "purple", label: "パープル", swatch: "#B79CF0" },
];

/** デバイス一覧の初期状態（mockup 01 / 02 準拠）。 */
export const DEVICES: Device[] = [
  {
    id: "living-light",
    name: "リビングの照明",
    model: "Color Bulb",
    room: "リビング",
    category: "light",
    controls: { power: true, brightness: 72, colorId: "warm" },
    colorOptions: BULB_COLORS,
  },
  {
    id: "circulator",
    name: "サーキュレーター",
    model: "Plug Mini",
    room: "リビング",
    category: "fan",
    controls: { power: false },
  },
  {
    id: "bedroom-curtain",
    name: "寝室のカーテン",
    model: "Curtain 3",
    room: "寝室",
    category: "curtain",
    controls: { power: true, position: 80 },
  },
  {
    id: "humidifier",
    name: "加湿器",
    model: "Humidifier",
    room: "寝室",
    category: "humidifier",
    controls: { power: false },
  },
  {
    id: "entrance-light",
    name: "玄関の照明",
    model: "Bulb",
    room: "玄関",
    category: "light",
    controls: { power: true },
  },
  {
    id: "entrance-lock",
    name: "玄関の鍵",
    model: "Lock Pro",
    room: "玄関",
    category: "lock",
    controls: { power: true },
  },
];

/** シーン一覧（mockup 04 準拠）。 */
export const SCENES: Scene[] = [
  {
    id: "goodnight",
    name: "おやすみ",
    description: "照明オフ・カーテン閉・加湿器オン",
    icon: "sleep",
  },
  {
    id: "arrive",
    name: "帰宅",
    description: "玄関・リビング点灯・エアコンオン",
    icon: "home",
  },
  {
    id: "goodmorning",
    name: "おはよう",
    description: "カーテン開・照明徐々に点灯",
    icon: "morning",
  },
  {
    id: "movie",
    name: "映画モード",
    description: "照明を暗く・カーテン閉",
    icon: "movie",
  },
];

/** センサー計測値（mockup 03 準拠）。履歴はスパークライン用の系列。 */
export const SENSORS: SensorReadings = {
  source: "リビングの温湿度計",
  updatedAt: "21:04",
  metrics: [
    {
      id: "temperature",
      label: "温度",
      icon: "temperature",
      value: 24.5,
      unit: "°C",
      display: "sparkline",
      tone: "accent",
      history: [23.6, 23.9, 23.8, 24.4, 24.1, 24.7, 24.5],
    },
    {
      id: "humidity",
      label: "湿度",
      icon: "humidity",
      value: 52,
      unit: "%",
      display: "sparkline",
      tone: "muted",
      history: [54, 52, 55, 51, 53, 50, 52],
    },
    {
      id: "co2",
      label: "CO₂",
      icon: "co2",
      value: 620,
      unit: "ppm",
      display: "sparkline",
      tone: "ok",
      history: [590, 585, 605, 600, 640, 615, 620],
    },
    {
      id: "battery",
      label: "バッテリー",
      icon: "battery",
      value: 88,
      unit: "%",
      display: "meter",
      tone: "accent",
    },
  ],
};
