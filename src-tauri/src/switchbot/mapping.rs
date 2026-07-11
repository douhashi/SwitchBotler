//! SwitchBot API の生 JSON → フロント向け view-model DTO への変換。
//!
//! 決定1: 生レスポンス形の知識はここ（Rust）に閉じ込め、フロントには camelCase の
//! view-model 一致 DTO のみを返す。決定2: カラーは preset↔RGB 変換をここで行い、
//! フロントは preset（colorId）契約のみを扱う。
//!
//! 純関数中心でユニットテスト可能に保つ。実 API の deviceType/status 構造は
//! `.tmp/spira-evidence/`（V1/V2）と公式 README（Curtain/Lock/Humidifier）で確定。

use serde::Serialize;
use serde_json::Value;

/// デバイスの可変状態。持つ制御は種別により異なる（camelCase シリアライズ）。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ControlsDto {
    /// 電源 ON/OFF。鍵は施錠状態（true=施錠）、カーテンは開状態を表す。
    pub power: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub brightness: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<u8>,
}

impl ControlsDto {
    fn power_only(power: bool) -> Self {
        Self {
            power,
            brightness: None,
            color_id: None,
            position: None,
        }
    }
}

/// カラー電球のカラー候補。swatch は UI プレゼンテーション色。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorOptionDto {
    pub id: String,
    pub label: String,
    pub swatch: String,
}

/// デバイス 1 台の view-model。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceDto {
    pub id: String,
    pub name: String,
    /// 製品モデル名（= deviceType。サブテキスト表示用）。
    pub model: String,
    pub category: String,
    /// 操作対応済みの既知種別か。false なら一覧で「未対応」読み取り表示にする。
    pub supported: bool,
    pub controls: ControlsDto,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color_options: Option<Vec<ColorOptionDto>>,
}

/// シーン 1 件の view-model。API は sceneId/sceneName のみを返す（V4）。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneDto {
    pub id: String,
    pub name: String,
}

/// センサー計測値 1 項目。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorMetricDto {
    pub id: String,
    pub label: String,
    pub icon: String,
    pub value: f64,
    pub unit: String,
}

/// センサー 1 台分の読み取り（履歴なし。決定3）。センサーごとに 1 件返す。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorReadingsDto {
    /// センサーの deviceId。フロントでの並べ替え順の永続化キーに使う。
    pub id: String,
    /// センサー名（例: "リビングの温湿度計"）。
    pub source: String,
    pub metrics: Vec<SensorMetricDto>,
}

/// デバイス一覧の 1 エントリ（id/name/deviceType）。status 取得の対象決定に使う。
pub struct DeviceMeta {
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub category: &'static str,
    pub supported: bool,
}

/// deviceType → カテゴリ。既知の操作対応種別のみ具体カテゴリ、他は "other"（未対応）。
/// 実在確認済み: Plug / Color Bulb / Strip Light / Bot / Plug Mini (JP)。
/// Curtain / Humidifier / Lock は公式 README 準拠（当アカウントに実機なし）。
pub fn category_for(device_type: &str) -> &'static str {
    match device_type {
        "Color Bulb" | "Strip Light" | "Bulb" | "Ceiling Light" | "Ceiling Light Pro" => "light",
        "Plug" | "Plug Mini (US)" | "Plug Mini (JP)" => "plug",
        "Bot" => "bot",
        "Curtain" | "Curtain3" => "curtain",
        "Humidifier" => "humidifier",
        "Smart Lock" | "Smart Lock Pro" => "lock",
        _ => "other",
    }
}

/// カラーを持つ種別か（status に "color" フィールドがある light 系）。
fn has_color(device_type: &str) -> bool {
    matches!(device_type, "Color Bulb" | "Strip Light")
}

/// `body.deviceList[]` を DeviceMeta のリストへ。infraredRemoteList も末尾に含める
/// （決定5: 赤外線は一覧に読み取り表示のみ、操作は M4）。
pub fn map_device_list(body: &Value) -> Vec<DeviceMeta> {
    let mut out = Vec::new();

    if let Some(list) = body.get("deviceList").and_then(Value::as_array) {
        for d in list {
            let device_type = string_field(d, "deviceType");
            let category = category_for(&device_type);
            out.push(DeviceMeta {
                id: string_field(d, "deviceId"),
                name: string_field(d, "deviceName"),
                device_type,
                category,
                supported: category != "other",
            });
        }
    }

    if let Some(list) = body.get("infraredRemoteList").and_then(Value::as_array) {
        for d in list {
            out.push(DeviceMeta {
                id: string_field(d, "deviceId"),
                name: string_field(d, "deviceName"),
                // remoteType を model 表示に流用。赤外線は現状すべて未対応（読み取り表示）。
                device_type: string_field(d, "remoteType"),
                category: "other",
                supported: false,
            });
        }
    }

    out
}

/// メタ + status body から DeviceDto を構築する。未対応種別は status 取得不要
/// （controls は電源 off 相当のプレースホルダ）。
pub fn build_device(meta: &DeviceMeta, status: Option<&Value>) -> DeviceDto {
    let controls = match status {
        Some(body) => controls_from_status(meta.category, &meta.device_type, body),
        None => ControlsDto::power_only(false),
    };
    let color_options = if has_color(&meta.device_type) {
        Some(color_options())
    } else {
        None
    };
    DeviceDto {
        id: meta.id.clone(),
        name: meta.name.clone(),
        model: meta.device_type.clone(),
        category: meta.category.to_string(),
        supported: meta.supported,
        controls,
        color_options,
    }
}

/// status body → ControlsDto（カテゴリごとに差分吸収）。
fn controls_from_status(category: &str, device_type: &str, body: &Value) -> ControlsDto {
    match category {
        "light" => ControlsDto {
            power: power_on(body),
            brightness: u8_field(body, "brightness"),
            color_id: if has_color(device_type) {
                body.get("color")
                    .and_then(Value::as_str)
                    .map(nearest_color_id)
            } else {
                None
            },
            position: None,
        },
        "curtain" => {
            let position = u8_field(body, "slidePosition");
            ControlsDto {
                // 開度 > 0 を「開（電源相当）」とみなす（表示ラベル用）。
                power: position.map(|p| p > 0).unwrap_or(false),
                brightness: None,
                color_id: None,
                position,
            }
        }
        "lock" => ControlsDto::power_only(matches!(
            body.get("lockState").and_then(Value::as_str),
            Some("locked") | Some("lock") | Some("latchBoltLocked")
        )),
        // plug / bot / humidifier など power のみ。
        _ => ControlsDto::power_only(power_on(body)),
    }
}

/// `body.body`（scenes は body 直下が配列）→ SceneDto のリスト。
pub fn map_scenes(body: &Value) -> Vec<SceneDto> {
    body.as_array()
        .map(|list| {
            list.iter()
                .map(|s| SceneDto {
                    id: string_field(s, "sceneId"),
                    name: string_field(s, "sceneName"),
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Meter 系 status body → センサー読み取り（温度・湿度・バッテリー）。
pub fn build_sensor_readings(id: &str, source: &str, body: &Value) -> SensorReadingsDto {
    let mut metrics = Vec::new();
    if let Some(v) = body.get("temperature").and_then(Value::as_f64) {
        metrics.push(SensorMetricDto {
            id: "temperature".into(),
            label: "温度".into(),
            icon: "temperature".into(),
            value: v,
            unit: "°C".into(),
        });
    }
    if let Some(v) = body.get("humidity").and_then(Value::as_f64) {
        metrics.push(SensorMetricDto {
            id: "humidity".into(),
            label: "湿度".into(),
            icon: "humidity".into(),
            value: v,
            unit: "%".into(),
        });
    }
    if let Some(v) = body.get("battery").and_then(Value::as_f64) {
        metrics.push(SensorMetricDto {
            id: "battery".into(),
            label: "バッテリー".into(),
            icon: "battery".into(),
            value: v,
            unit: "%".into(),
        });
    }
    SensorReadingsDto {
        id: id.to_string(),
        source: source.to_string(),
        metrics,
    }
}

/// Meter 系（センサー画面の対象）deviceType か。
pub fn is_meter(device_type: &str) -> bool {
    matches!(
        device_type,
        "Meter" | "MeterPlus" | "WoIOSensor" | "MeterPro" | "MeterPro(CO2)"
    )
}

// ---- カラー preset ↔ RGB（決定2: Rust が変換を所有） ----

/// カラー preset の定義。swatch は UI 表示色、rgb は実 API に送る色。
struct Preset {
    id: &'static str,
    label: &'static str,
    swatch: &'static str,
    rgb: (u8, u8, u8),
}

const fn preset(
    id: &'static str,
    label: &'static str,
    swatch: &'static str,
    rgb: (u8, u8, u8),
) -> Preset {
    Preset {
        id,
        label,
        swatch,
        rgb,
    }
}

const PRESETS: &[Preset] = &[
    preset("warm", "電球色", "#F6D488", (255, 214, 136)),
    preset("neutral", "昼白色", "#FDF6E3", (255, 246, 227)),
    preset("cool", "昼光色", "#8FB7FF", (143, 183, 255)),
    preset("red", "レッド", "#F58A8A", (255, 0, 0)),
    preset("green", "グリーン", "#8CE0B0", (0, 200, 90)),
    preset("purple", "パープル", "#B79CF0", (150, 80, 240)),
];

/// フロントに返すカラー候補（既存 preset 契約を維持）。
pub fn color_options() -> Vec<ColorOptionDto> {
    PRESETS
        .iter()
        .map(|p| ColorOptionDto {
            id: p.id.to_string(),
            label: p.label.to_string(),
            swatch: p.swatch.to_string(),
        })
        .collect()
}

/// preset id → setColor 用 "R:G:B" 文字列。未知 id は電球色にフォールバック。
pub fn preset_to_rgb(color_id: &str) -> String {
    let (r, g, b) = PRESETS
        .iter()
        .find(|p| p.id == color_id)
        .map(|p| p.rgb)
        .unwrap_or(PRESETS[0].rgb);
    format!("{r}:{g}:{b}")
}

/// status の "R:G:B" → 最も近い preset id（ユークリッド距離）。
fn nearest_color_id(rgb: &str) -> String {
    let (r, g, b) = match parse_rgb(rgb) {
        Some(v) => v,
        None => return PRESETS[0].id.to_string(),
    };
    PRESETS
        .iter()
        .min_by_key(|p| {
            let (pr, pg, pb) = p.rgb;
            let dr = r as i64 - pr as i64;
            let dg = g as i64 - pg as i64;
            let db = b as i64 - pb as i64;
            dr * dr + dg * dg + db * db
        })
        .map(|p| p.id.to_string())
        .unwrap_or_else(|| PRESETS[0].id.to_string())
}

fn parse_rgb(rgb: &str) -> Option<(u8, u8, u8)> {
    let mut parts = rgb.split(':');
    let r = parts.next()?.trim().parse().ok()?;
    let g = parts.next()?.trim().parse().ok()?;
    let b = parts.next()?.trim().parse().ok()?;
    Some((r, g, b))
}

// ---- 小さなフィールド抽出ヘルパ ----

fn string_field(v: &Value, key: &str) -> String {
    v.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn u8_field(v: &Value, key: &str) -> Option<u8> {
    v.get(key)
        .and_then(Value::as_i64)
        .map(|n| n.clamp(0, 100) as u8)
}

fn power_on(v: &Value) -> bool {
    v.get("power").and_then(Value::as_str) == Some("on")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn maps_real_device_types_to_categories() {
        // V1 実在種別。
        assert_eq!(category_for("Color Bulb"), "light");
        assert_eq!(category_for("Strip Light"), "light");
        assert_eq!(category_for("Plug"), "plug");
        assert_eq!(category_for("Plug Mini (JP)"), "plug");
        assert_eq!(category_for("Bot"), "bot");
        // 未対応（センサー・ハブ等）は other。
        assert_eq!(category_for("Meter"), "other");
        assert_eq!(category_for("Motion Sensor"), "other");
        assert_eq!(category_for("Hub Mini"), "other");
        // README 準拠（実機なし）。
        assert_eq!(category_for("Curtain3"), "curtain");
        assert_eq!(category_for("Smart Lock"), "lock");
        assert_eq!(category_for("Humidifier"), "humidifier");
    }

    #[test]
    fn map_device_list_includes_infrared_as_unsupported() {
        // V1 の実構造（伏字済みキー）を模す。
        let body = json!({
            "deviceList": [
                {"deviceId": "d1", "deviceName": "n1", "deviceType": "Plug"},
                {"deviceId": "d2", "deviceName": "n2", "deviceType": "Meter"}
            ],
            "infraredRemoteList": [
                {"deviceId": "r1", "deviceName": "rn1", "remoteType": "Air Conditioner"}
            ]
        });
        let metas = map_device_list(&body);
        assert_eq!(metas.len(), 3);
        assert_eq!(metas[0].category, "plug");
        assert!(metas[0].supported);
        assert_eq!(metas[1].category, "other");
        assert!(!metas[1].supported);
        // 赤外線は一覧に出すが未対応。
        assert_eq!(metas[2].category, "other");
        assert!(!metas[2].supported);
        assert_eq!(metas[2].device_type, "Air Conditioner");
    }

    #[test]
    fn builds_color_bulb_controls_from_real_status() {
        // V2 実 body（Color Bulb）。
        let status = json!({
            "power": "on",
            "brightness": 100,
            "color": "255:142:65",
            "colorTemperature": 0
        });
        let meta = DeviceMeta {
            id: "d".into(),
            name: "bulb".into(),
            device_type: "Color Bulb".into(),
            category: "light",
            supported: true,
        };
        let dto = build_device(&meta, Some(&status));
        assert!(dto.controls.power);
        assert_eq!(dto.controls.brightness, Some(100));
        // "255:142:65"（オレンジ寄り）は warm が最近傍。
        assert_eq!(dto.controls.color_id.as_deref(), Some("warm"));
        assert!(dto.color_options.is_some());
        assert_eq!(dto.category, "light");
    }

    #[test]
    fn builds_plug_controls_power_only() {
        let status = json!({ "power": "off" });
        let meta = DeviceMeta {
            id: "d".into(),
            name: "plug".into(),
            device_type: "Plug".into(),
            category: "plug",
            supported: true,
        };
        let dto = build_device(&meta, Some(&status));
        assert!(!dto.controls.power);
        assert_eq!(dto.controls.brightness, None);
        assert_eq!(dto.controls.color_id, None);
        assert!(dto.color_options.is_none());
    }

    #[test]
    fn unsupported_device_gets_placeholder_controls_without_status_call() {
        let meta = DeviceMeta {
            id: "d".into(),
            name: "meter".into(),
            device_type: "Meter".into(),
            category: "other",
            supported: false,
        };
        let dto = build_device(&meta, None);
        assert!(!dto.supported);
        assert!(!dto.controls.power);
    }

    #[test]
    fn curtain_position_maps_to_open_state() {
        // README 準拠（slidePosition）。
        let status = json!({ "slidePosition": 80, "calibrate": true });
        let controls = controls_from_status("curtain", "Curtain3", &status);
        assert_eq!(controls.position, Some(80));
        assert!(controls.power);
    }

    #[test]
    fn lock_state_maps_to_power() {
        let locked = json!({ "lockState": "locked" });
        assert!(controls_from_status("lock", "Smart Lock", &locked).power);
        let unlocked = json!({ "lockState": "unlock" });
        assert!(!controls_from_status("lock", "Smart Lock", &unlocked).power);
    }

    #[test]
    fn maps_scenes_from_real_shape() {
        // V4 実構造（body 直下が配列、sceneId/sceneName のみ）。
        let body = json!([
            {"sceneId": "s1", "sceneName": "name1"},
            {"sceneId": "s2", "sceneName": "name2"}
        ]);
        let scenes = map_scenes(&body);
        assert_eq!(scenes.len(), 2);
        assert_eq!(scenes[0].id, "s1");
        assert_eq!(scenes[1].name, "name2");
    }

    #[test]
    fn builds_sensor_readings_from_meter_status() {
        // V2 実 body（Meter）。
        let body = json!({ "temperature": 26.2, "battery": 100, "humidity": 44 });
        let r = build_sensor_readings("meter-id", "meter-name", &body);
        assert_eq!(r.id, "meter-id");
        assert_eq!(r.source, "meter-name");
        let ids: Vec<&str> = r.metrics.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(ids, vec!["temperature", "humidity", "battery"]);
        assert_eq!(r.metrics[0].value, 26.2);
        assert_eq!(r.metrics[0].unit, "°C");
    }

    #[test]
    fn preset_rgb_roundtrip_stays_stable() {
        // preset → RGB → 最近傍 preset が自分自身に戻る。
        for p in PRESETS {
            let rgb = preset_to_rgb(p.id);
            assert_eq!(nearest_color_id(&rgb), p.id, "preset {} が安定しない", p.id);
        }
    }

    #[test]
    fn preset_to_rgb_uses_colon_separator() {
        // 実 API の setColor は "R:G:B"（V2/V3 で確認）。
        assert_eq!(preset_to_rgb("red"), "255:0:0");
        // 未知 id は電球色フォールバック。
        assert_eq!(preset_to_rgb("unknown"), "255:214:136");
    }

    #[test]
    fn serializes_controls_as_camel_case() {
        let dto = ControlsDto {
            power: true,
            brightness: Some(50),
            color_id: Some("warm".into()),
            position: None,
        };
        let json = serde_json::to_value(&dto).unwrap();
        assert_eq!(json["power"], true);
        assert_eq!(json["brightness"], 50);
        assert_eq!(json["colorId"], "warm");
        // None は省略される（position キーが無い）。
        assert!(json.get("position").is_none());
    }
}
