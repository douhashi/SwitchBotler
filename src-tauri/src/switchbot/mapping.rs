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
    /// 設定温度（摂氏の整数。エアコンのみ）。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<u8>,
    /// 運転モード（"auto"/"cool"/"dry"/"fan"/"heat"。エアコンのみ）。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    /// 風量（"auto"/"low"/"medium"/"high"。エアコンのみ）。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fan_speed: Option<String>,
    /// Bot の動作モード（"press"/"switch"/"customize"。Bot のみ）。
    /// status の `deviceMode` を正規化したもの。未知値・欠損は None。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bot_mode: Option<String>,
}

/// エアコンのデフォルト初期値（赤外線は status を返さないため送信前の初期表示に使う）。
/// 単一の正としてここに集約する。
const AIRCON_DEFAULT_TEMP: u8 = 26;
const AIRCON_DEFAULT_MODE: &str = "cool";
const AIRCON_DEFAULT_FAN: &str = "auto";

impl ControlsDto {
    fn power_only(power: bool) -> Self {
        Self {
            power,
            brightness: None,
            color_id: None,
            position: None,
            temperature: None,
            mode: None,
            fan_speed: None,
            bot_mode: None,
        }
    }

    /// エアコンの初期 controls（power off / 26℃ / cool / auto）。
    fn aircon_default() -> Self {
        Self {
            power: false,
            brightness: None,
            color_id: None,
            position: None,
            temperature: Some(AIRCON_DEFAULT_TEMP),
            mode: Some(AIRCON_DEFAULT_MODE.to_string()),
            fan_speed: Some(AIRCON_DEFAULT_FAN.to_string()),
            bot_mode: None,
        }
    }
}

/// カラー電球のカラー候補。swatch は UI プレゼンテーション色。
/// 表示名は安定 `id`（warm/neutral/cool/red/green/purple）からフロントが翻訳する（i18n）。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorOptionDto {
    pub id: String,
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

/// センサー計測値 1 項目。数値メーター（温度/湿度/電池）と状態表示（人感/明るさ）の
/// 2 表現を `kind` で判別する。gauge は `value`/`unit`、state は `state`/`tone` を使い、
/// 使わない側は省略（`skip_serializing_if`）してフロントの判別共用体と 1:1 対応させる。
/// 表示ラベル・区分テキストは持たず、フロントが `icon`・`state` キーから翻訳する（i18n）。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorMetricDto {
    /// "gauge"（0-100 メーター）または "state"（区分テキスト）。
    pub kind: &'static str,
    pub id: String,
    /// 計測種別を表す安定キー（temperature/humidity/battery/motion/brightness）。
    /// フロントがアイコンと計測ラベルの両方をこれから引く（i18n）。
    pub icon: String,
    /// gauge 用の数値。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
    /// gauge 用の単位（"°C" / "%"）。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    /// state 用の安定な状態キー（motion: "active"/"idle"、brightness: "bright"/"dim"）。
    /// フロントが `sensors:state.<icon>.<state>` から区分テキストを翻訳する（i18n）。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<&'static str>,
    /// state 用の強調区分。"active"（起きている状態）/ "idle"（静穏）。無指定はニュートラル。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tone: Option<&'static str>,
}

impl SensorMetricDto {
    /// 数値メーター表現（温度/湿度/電池）。
    fn gauge(icon: &str, value: f64, unit: &str) -> Self {
        Self {
            kind: "gauge",
            id: icon.into(),
            icon: icon.into(),
            value: Some(value),
            unit: Some(unit.into()),
            state: None,
            tone: None,
        }
    }

    /// 状態表示（人感/明るさ）。`state` は安定な状態キー、`tone` は None でニュートラル表示。
    fn state(icon: &str, state: &'static str, tone: Option<&'static str>) -> Self {
        Self {
            kind: "state",
            id: icon.into(),
            icon: icon.into(),
            value: None,
            unit: None,
            state: Some(state),
            tone,
        }
    }
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
    /// 赤外線（仮想）デバイスか。true は status エンドポイントを持たない
    /// （status 取得の対象外にする。決定・V5）。
    pub infrared: bool,
}

/// deviceType（実デバイス）→ カテゴリ。既知の操作対応種別のみ具体カテゴリ、他は "other"（未対応）。
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

/// remoteType（赤外線・仮想デバイス）→ カテゴリ。操作対応はエアコンとライト。
/// remoteType の実値は実 API 未確認のため各種別の標準名・DIY 名を両対応でマップする。
pub fn infrared_category_for(remote_type: &str) -> &'static str {
    match remote_type {
        "Air Conditioner" | "DIY Air Conditioner" => "aircon",
        "Light" | "DIY Light" => "ir_light",
        _ => "other",
    }
}

/// 赤外線ライトの操作 action（view-model）→ SwitchBot コマンド名。
/// Light は絶対的な明るさ・状態を持たず、電源と相対的な明暗のみを扱う（公式 README）。
/// 未知 action は安全側（消灯）にフォールバックする。
pub fn ir_light_command(action: &str) -> &'static str {
    match action {
        "on" => "turnOn",
        "brighter" => "brightnessUp",
        "dimmer" => "brightnessDown",
        // "off" とそれ以外は安全側の消灯へ。
        _ => "turnOff",
    }
}

/// カラーを持つ種別か（status に "color" フィールドがある light 系）。
fn has_color(device_type: &str) -> bool {
    matches!(device_type, "Color Bulb" | "Strip Light")
}

/// `body.deviceList[]` を DeviceMeta のリストへ。infraredRemoteList も末尾に含める。
/// 赤外線はエアコン（aircon）のみ操作対応、他は従来どおり読み取り表示（other）。
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
                infrared: false,
            });
        }
    }

    if let Some(list) = body.get("infraredRemoteList").and_then(Value::as_array) {
        for d in list {
            // remoteType を model 表示に流用。エアコンのみ操作対応（aircon）、他は未対応。
            let remote_type = string_field(d, "remoteType");
            let category = infrared_category_for(&remote_type);
            out.push(DeviceMeta {
                id: string_field(d, "deviceId"),
                name: string_field(d, "deviceName"),
                device_type: remote_type,
                category,
                supported: category != "other",
                infrared: true,
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
        // 赤外線エアコンは status を持たない。初期値（power off/26℃/cool/auto）を返す。
        // フロントは永続化した「最後に送信した値」を重畳して表示する。
        None if meta.category == "aircon" => ControlsDto::aircon_default(),
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
            temperature: None,
            mode: None,
            fan_speed: None,
            bot_mode: None,
        },
        "curtain" => {
            let position = u8_field(body, "slidePosition");
            ControlsDto {
                // 開度 > 0 を「開（電源相当）」とみなす（表示ラベル用）。
                power: position.map(|p| p > 0).unwrap_or(false),
                brightness: None,
                color_id: None,
                position,
                temperature: None,
                mode: None,
                fan_speed: None,
                bot_mode: None,
            }
        }
        "lock" => ControlsDto::power_only(matches!(
            body.get("lockState").and_then(Value::as_str),
            Some("locked") | Some("lock") | Some("latchBoltLocked")
        )),
        "bot" => ControlsDto {
            power: power_on(body),
            brightness: None,
            color_id: None,
            position: None,
            temperature: None,
            mode: None,
            fan_speed: None,
            // deviceMode（pressMode/switchMode/customizeMode）を UI 契約値に正規化する。
            // 未知値・欠損は None（フロントは従来のトグル扱いへフォールバック）。
            bot_mode: bot_mode(body),
        },
        // plug / humidifier など power のみ。
        _ => ControlsDto::power_only(power_on(body)),
    }
}

/// Bot status の `deviceMode` を UI 契約値に正規化する。
/// 公式 README: `pressMode` / `switchMode` / `customizeMode`。未知値・欠損は None。
fn bot_mode(body: &Value) -> Option<String> {
    match body.get("deviceMode").and_then(Value::as_str) {
        Some("pressMode") => Some("press".to_string()),
        Some("switchMode") => Some("switch".to_string()),
        Some("customizeMode") => Some("customize".to_string()),
        _ => None,
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

/// センサー系 status body → センサー読み取り。フィールドの有無で温湿度計（温度/湿度/電池）
/// と人感センサー（人感/明るさ/電池）を単一関数で吸収する（DRY）。抽出順がそのまま
/// 表示順になる（温湿度計＝温度/湿度/電池、人感＝検知/明るさ/電池）。
pub fn build_sensor_readings(id: &str, source: &str, body: &Value) -> SensorReadingsDto {
    let mut metrics = Vec::new();
    if let Some(v) = body.get("temperature").and_then(Value::as_f64) {
        metrics.push(SensorMetricDto::gauge("temperature", v, "°C"));
    }
    if let Some(v) = body.get("humidity").and_then(Value::as_f64) {
        metrics.push(SensorMetricDto::gauge("humidity", v, "%"));
    }
    if let Some(detected) = body.get("moveDetected").and_then(Value::as_bool) {
        // 検知は良し悪しでなく「起きている状態」なので tone は active/idle（sd-accent 強調）。
        // 状態キーも active/idle で、フロントが sensors:state.motion.<state> を翻訳する。
        let state = if detected { "active" } else { "idle" };
        metrics.push(SensorMetricDto::state("motion", state, Some(state)));
    }
    // 人感センサーの brightness は String("bright"/"dim")。数値 brightness（light 系）は
    // センサー画面の対象外なので as_str で自然に除外される。tone は無指定（ニュートラル）。
    if let Some(b) = body.get("brightness").and_then(Value::as_str) {
        let state = match b {
            "bright" => Some("bright"),
            "dim" => Some("dim"),
            _ => None,
        };
        if let Some(state) = state {
            metrics.push(SensorMetricDto::state("brightness", state, None));
        }
    }
    if let Some(v) = body.get("battery").and_then(Value::as_f64) {
        metrics.push(SensorMetricDto::gauge("battery", v, "%"));
    }
    SensorReadingsDto {
        id: id.to_string(),
        source: source.to_string(),
        metrics,
    }
}

/// センサー画面の対象 deviceType か（温湿度計系 + 人感センサー）。
/// 一覧では従来どおり `category_for` が "other"（読み取り表示）だが、センサー画面には
/// この判定で並べる（Meter と同一方針）。
pub fn is_sensor(device_type: &str) -> bool {
    matches!(
        device_type,
        "Meter" | "MeterPlus" | "WoIOSensor" | "MeterPro" | "MeterPro(CO2)" | "Motion Sensor"
    )
}

// ---- エアコン setAll パラメータ組み立て（Rust が enum→数値エンコードを所有） ----

/// 運転モード（view-model）→ setAll の数値コード。
/// 公式 README: 0/1=auto, 2=cool, 3=dry, 4=fan, 5=heat。auto は 1 を送る。
/// 未知値は auto にフォールバック。
fn mode_code(mode: &str) -> u8 {
    match mode {
        "cool" => 2,
        "dry" => 3,
        "fan" => 4,
        "heat" => 5,
        // "auto" とそれ以外。
        _ => 1,
    }
}

/// 風量（view-model）→ setAll の数値コード。
/// 公式 README: 1=auto, 2=low, 3=medium, 4=high。未知値は auto にフォールバック。
fn fan_code(fan: &str) -> u8 {
    match fan {
        "low" => 2,
        "medium" => 3,
        "high" => 4,
        // "auto" とそれ以外。
        _ => 1,
    }
}

/// エアコンの view-model 状態 → setAll の `parameter` 文字列
/// `"{temperature},{mode},{fan speed},{power state}"`（例 "26,2,1,off"）。
/// 決定1: フロントは意味論（"cool"/"high"）だけを扱い、数値エンコードは Rust が所有する。
pub fn aircon_parameter(temperature: u8, mode: &str, fan: &str, power: bool) -> String {
    let power_state = if power { "on" } else { "off" };
    format!(
        "{},{},{},{}",
        temperature,
        mode_code(mode),
        fan_code(fan),
        power_state
    )
}

// ---- カラー preset ↔ RGB（決定2: Rust が変換を所有） ----

/// カラー preset の定義。swatch は UI 表示色、rgb は実 API に送る色。
/// 表示名は持たない（フロントが安定 `id` から翻訳する）。
struct Preset {
    id: &'static str,
    swatch: &'static str,
    rgb: (u8, u8, u8),
}

const fn preset(id: &'static str, swatch: &'static str, rgb: (u8, u8, u8)) -> Preset {
    Preset { id, swatch, rgb }
}

const PRESETS: &[Preset] = &[
    preset("warm", "#F6D488", (255, 214, 136)),
    preset("neutral", "#FDF6E3", (255, 246, 227)),
    preset("cool", "#8FB7FF", (143, 183, 255)),
    preset("red", "#F58A8A", (255, 0, 0)),
    preset("green", "#8CE0B0", (0, 200, 90)),
    preset("purple", "#B79CF0", (150, 80, 240)),
];

/// フロントに返すカラー候補（既存 preset 契約を維持。表示名は id から front が翻訳）。
pub fn color_options() -> Vec<ColorOptionDto> {
    PRESETS
        .iter()
        .map(|p| ColorOptionDto {
            id: p.id.to_string(),
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
    fn map_device_list_maps_aircon_and_leaves_other_infrared_unsupported() {
        // V1 の実構造（伏字済みキー）を模す。赤外線 AC は aircon（操作対応・infrared）、
        // それ以外の赤外線（例 TV）は従来どおり other（読み取り表示）。
        let body = json!({
            "deviceList": [
                {"deviceId": "d1", "deviceName": "n1", "deviceType": "Plug"},
                {"deviceId": "d2", "deviceName": "n2", "deviceType": "Meter"}
            ],
            "infraredRemoteList": [
                {"deviceId": "r1", "deviceName": "rn1", "remoteType": "Air Conditioner"},
                {"deviceId": "r2", "deviceName": "rn2", "remoteType": "TV"}
            ]
        });
        let metas = map_device_list(&body);
        assert_eq!(metas.len(), 4);

        // 実デバイスは infrared=false。
        assert_eq!(metas[0].category, "plug");
        assert!(metas[0].supported);
        assert!(!metas[0].infrared);
        assert_eq!(metas[1].category, "other");
        assert!(!metas[1].supported);
        assert!(!metas[1].infrared);

        // 赤外線 AC は aircon・操作対応・infrared。
        assert_eq!(metas[2].category, "aircon");
        assert!(metas[2].supported);
        assert!(metas[2].infrared);
        assert_eq!(metas[2].device_type, "Air Conditioner");

        // AC 以外の赤外線は未対応だが infrared フラグは立つ（status 取得対象外）。
        assert_eq!(metas[3].category, "other");
        assert!(!metas[3].supported);
        assert!(metas[3].infrared);
        assert_eq!(metas[3].device_type, "TV");
    }

    #[test]
    fn diy_air_conditioner_also_maps_to_aircon() {
        // remoteType 実値未確認のため両対応（実機で確定要）。
        assert_eq!(infrared_category_for("Air Conditioner"), "aircon");
        assert_eq!(infrared_category_for("DIY Air Conditioner"), "aircon");
        assert_eq!(infrared_category_for("TV"), "other");
    }

    #[test]
    fn light_and_diy_light_map_to_ir_light() {
        // Light / DIY Light を共に標準コマンド経路（ir_light）へマップする（PO 論点1: (A)）。
        // remoteType 実値未確認のため両対応（実機で確定要）。
        assert_eq!(infrared_category_for("Light"), "ir_light");
        assert_eq!(infrared_category_for("DIY Light"), "ir_light");
        assert_eq!(infrared_category_for("TV"), "other");
    }

    #[test]
    fn builds_ir_light_power_off_controls_without_status_call() {
        // 赤外線ライトは status を持たないため build_device は None を受け、電源 off を返す。
        // 明るさ・状態は持たない（相対コマンドのみ）。
        let meta = DeviceMeta {
            id: "r1".into(),
            name: "light".into(),
            device_type: "Light".into(),
            category: "ir_light",
            supported: true,
            infrared: true,
        };
        let dto = build_device(&meta, None);
        assert_eq!(dto.category, "ir_light");
        assert!(dto.supported);
        assert!(!dto.controls.power);
        // ライト系フィールドは持たない（絶対値を扱わない）。
        assert_eq!(dto.controls.brightness, None);
        assert_eq!(dto.controls.temperature, None);
        assert!(dto.color_options.is_none());
    }

    #[test]
    fn ir_light_command_maps_action_to_command() {
        // 公式 README: Light は turnOn/turnOff（電源）と brightnessUp/Down（相対明暗）。
        assert_eq!(ir_light_command("on"), "turnOn");
        assert_eq!(ir_light_command("off"), "turnOff");
        assert_eq!(ir_light_command("brighter"), "brightnessUp");
        assert_eq!(ir_light_command("dimmer"), "brightnessDown");
        // 未知 action は安全側の消灯へフォールバック。
        assert_eq!(ir_light_command("unknown"), "turnOff");
    }

    #[test]
    fn builds_aircon_default_controls_without_status_call() {
        // 赤外線 AC は status を持たないため build_device は None を受ける。
        // 初期値 power off / 26℃ / cool / auto を返す。
        let meta = DeviceMeta {
            id: "r1".into(),
            name: "aircon".into(),
            device_type: "Air Conditioner".into(),
            category: "aircon",
            supported: true,
            infrared: true,
        };
        let dto = build_device(&meta, None);
        assert_eq!(dto.category, "aircon");
        assert!(dto.supported);
        assert!(!dto.controls.power);
        assert_eq!(dto.controls.temperature, Some(26));
        assert_eq!(dto.controls.mode.as_deref(), Some("cool"));
        assert_eq!(dto.controls.fan_speed.as_deref(), Some("auto"));
        // ライト系フィールドは持たない。
        assert_eq!(dto.controls.brightness, None);
        assert!(dto.color_options.is_none());
    }

    #[test]
    fn aircon_parameter_encodes_enum_to_setall_string() {
        // 公式 README: "{temp},{mode},{fan},{power}"。mode auto=1/cool=2/dry=3/fan=4/heat=5、
        // fan auto=1/low=2/medium=3/high=4、power on|off。
        assert_eq!(aircon_parameter(26, "cool", "auto", false), "26,2,1,off");
        assert_eq!(aircon_parameter(26, "auto", "high", true), "26,1,4,on");
        assert_eq!(aircon_parameter(16, "dry", "low", true), "16,3,2,on");
        assert_eq!(aircon_parameter(30, "fan", "medium", true), "30,4,3,on");
        assert_eq!(aircon_parameter(22, "heat", "auto", true), "22,5,1,on");
        // 未知の mode/fan は auto(1) にフォールバック。
        assert_eq!(
            aircon_parameter(25, "unknown", "unknown", false),
            "25,1,1,off"
        );
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
            infrared: false,
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
            infrared: false,
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
            infrared: false,
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
        // Meter は全項目 gauge（数値メーター）。
        assert!(r.metrics.iter().all(|m| m.kind == "gauge"));
        assert_eq!(r.metrics[0].value, Some(26.2));
        assert_eq!(r.metrics[0].unit.as_deref(), Some("°C"));
    }

    #[test]
    fn builds_sensor_readings_from_motion_sensor_status() {
        // V1 公式仕様準拠の body（Motion Sensor）。moveDetected=true / dim / battery。
        let body =
            json!({ "moveDetected": true, "brightness": "dim", "battery": 60, "version": "V4.2" });
        let r = build_sensor_readings("motion-id", "motion-name", &body);
        let ids: Vec<&str> = r.metrics.iter().map(|m| m.id.as_str()).collect();
        // 人感＝検知/明るさ/電池 の順。version は表示しない。
        assert_eq!(ids, vec!["motion", "brightness", "battery"]);

        // 人感: state / 状態キー active / tone active（フロントが検知ありを翻訳）。
        let motion = &r.metrics[0];
        assert_eq!(motion.kind, "state");
        assert_eq!(motion.icon, "motion");
        assert_eq!(motion.state, Some("active"));
        assert_eq!(motion.tone, Some("active"));
        assert_eq!(motion.value, None);

        // 明るさ: state / 状態キー dim / tone なし（ニュートラル）。
        let brightness = &r.metrics[1];
        assert_eq!(brightness.kind, "state");
        assert_eq!(brightness.icon, "brightness");
        assert_eq!(brightness.state, Some("dim"));
        assert_eq!(brightness.tone, None);

        // 電池: 既存どおり gauge（0-100 メーター）。
        let battery = &r.metrics[2];
        assert_eq!(battery.kind, "gauge");
        assert_eq!(battery.value, Some(60.0));
        assert_eq!(battery.unit.as_deref(), Some("%"));
    }

    #[test]
    fn motion_sensor_bright_and_idle_variants() {
        // moveDetected=false → 状態キー idle、brightness=bright → 状態キー bright。
        let body = json!({ "moveDetected": false, "brightness": "bright", "battery": 100 });
        let r = build_sensor_readings("m", "n", &body);
        assert_eq!(r.metrics[0].state, Some("idle"));
        assert_eq!(r.metrics[0].tone, Some("idle"));
        assert_eq!(r.metrics[1].state, Some("bright"));
    }

    #[test]
    fn meter_and_motion_bodies_pick_disjoint_metrics() {
        // V4: 両種別が相互に誤フィールドを拾わず、別メトリクス集合になること。
        let meter = build_sensor_readings(
            "m",
            "n",
            &json!({ "temperature": 20.0, "humidity": 50, "battery": 100 }),
        );
        let meter_ids: Vec<&str> = meter.metrics.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(meter_ids, vec!["temperature", "humidity", "battery"]);
        assert!(!meter_ids.contains(&"motion"));
        assert!(!meter_ids.contains(&"brightness"));

        let motion = build_sensor_readings(
            "m",
            "n",
            &json!({ "moveDetected": true, "brightness": "bright", "battery": 100 }),
        );
        let motion_ids: Vec<&str> = motion.metrics.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(motion_ids, vec!["motion", "brightness", "battery"]);
        assert!(!motion_ids.contains(&"temperature"));
        assert!(!motion_ids.contains(&"humidity"));
    }

    #[test]
    fn is_sensor_covers_meter_family_and_motion() {
        assert!(is_sensor("Meter"));
        assert!(is_sensor("WoIOSensor"));
        assert!(is_sensor("MeterPro(CO2)"));
        assert!(is_sensor("Motion Sensor"));
        // センサー画面の対象外。
        assert!(!is_sensor("Plug"));
        assert!(!is_sensor("Hub Mini"));
        // 一覧のカテゴリは Meter と同様 other 維持（読み取り表示）。
        assert_eq!(category_for("Motion Sensor"), "other");
    }

    #[test]
    fn serializes_state_metric_as_camel_case() {
        let m = SensorMetricDto::state("motion", "active", Some("active"));
        let json = serde_json::to_value(&m).unwrap();
        assert_eq!(json["kind"], "state");
        assert_eq!(json["id"], "motion");
        assert_eq!(json["icon"], "motion");
        // 表示名でなく安定な状態キーを持つ（フロントが翻訳する）。
        assert_eq!(json["state"], "active");
        assert_eq!(json["tone"], "active");
        // 日本語ラベルは持たない。gauge 用フィールドも省略される。
        assert!(json.get("label").is_none());
        assert!(json.get("value").is_none());
        assert!(json.get("unit").is_none());
    }

    #[test]
    fn serializes_gauge_metric_without_state_fields() {
        let m = SensorMetricDto::gauge("battery", 100.0, "%");
        let json = serde_json::to_value(&m).unwrap();
        assert_eq!(json["kind"], "gauge");
        assert_eq!(json["icon"], "battery");
        assert_eq!(json["value"], 100.0);
        assert_eq!(json["unit"], "%");
        // 日本語ラベル・state 用フィールドは省略される。
        assert!(json.get("label").is_none());
        assert!(json.get("state").is_none());
        assert!(json.get("tone").is_none());
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
    fn color_options_expose_stable_ids_without_label() {
        // 表示名は撤去し、安定 id（フロントが翻訳するキー）と swatch のみを返す。
        let options = color_options();
        let ids: Vec<&str> = options.iter().map(|o| o.id.as_str()).collect();
        assert_eq!(
            ids,
            vec!["warm", "neutral", "cool", "red", "green", "purple"]
        );
        let json = serde_json::to_value(&options[0]).unwrap();
        assert_eq!(json["id"], "warm");
        assert!(json["swatch"].is_string());
        // 日本語ラベルは持たない。
        assert!(json.get("label").is_none());
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
            temperature: None,
            mode: None,
            fan_speed: None,
            bot_mode: None,
        };
        let json = serde_json::to_value(&dto).unwrap();
        assert_eq!(json["power"], true);
        assert_eq!(json["brightness"], 50);
        assert_eq!(json["colorId"], "warm");
        // None は省略される（position/temperature/mode/fanSpeed/botMode キーが無い）。
        assert!(json.get("position").is_none());
        assert!(json.get("temperature").is_none());
        assert!(json.get("mode").is_none());
        assert!(json.get("fanSpeed").is_none());
        assert!(json.get("botMode").is_none());
    }

    #[test]
    fn bot_press_mode_normalizes_to_press() {
        // V1 公式仕様: Bot status は power / battery / deviceMode を返す。
        let status = json!({ "power": "on", "battery": 90, "deviceMode": "pressMode" });
        let controls = controls_from_status("bot", "Bot", &status);
        assert!(controls.power);
        assert_eq!(controls.bot_mode.as_deref(), Some("press"));
    }

    #[test]
    fn bot_switch_mode_normalizes_to_switch() {
        let status = json!({ "power": "off", "battery": 90, "deviceMode": "switchMode" });
        let controls = controls_from_status("bot", "Bot", &status);
        assert!(!controls.power);
        assert_eq!(controls.bot_mode.as_deref(), Some("switch"));
    }

    #[test]
    fn bot_customize_mode_is_preserved_not_dropped() {
        // PO 論点1: customizeMode は 3 値正規化で保持する（"customize" を捨てない）。
        let status = json!({ "power": "on", "battery": 90, "deviceMode": "customizeMode" });
        let controls = controls_from_status("bot", "Bot", &status);
        assert_eq!(controls.bot_mode.as_deref(), Some("customize"));
    }

    #[test]
    fn bot_missing_or_unknown_device_mode_is_none() {
        // PO 論点4: deviceMode 欠損/未知値は None（フロントは従来トグル扱いへフォールバック）。
        let missing = json!({ "power": "on", "battery": 90 });
        assert_eq!(controls_from_status("bot", "Bot", &missing).bot_mode, None);
        let unknown = json!({ "power": "on", "deviceMode": "unknownMode" });
        assert_eq!(controls_from_status("bot", "Bot", &unknown).bot_mode, None);
    }

    #[test]
    fn serializes_bot_mode_as_camel_case() {
        // V5: Rust の bot_mode が camelCase "botMode" でシリアライズされること。
        let status = json!({ "power": "on", "deviceMode": "pressMode" });
        let controls = controls_from_status("bot", "Bot", &status);
        let json = serde_json::to_value(&controls).unwrap();
        assert_eq!(json["botMode"], "press");
        // Bot は power / botMode のみ（ライト・エアコン系フィールドは省略）。
        assert!(json.get("brightness").is_none());
        assert!(json.get("temperature").is_none());
        assert!(json.get("fanSpeed").is_none());
    }

    #[test]
    fn serializes_aircon_controls_with_camel_case_fan_speed() {
        let dto = ControlsDto::aircon_default();
        let json = serde_json::to_value(&dto).unwrap();
        assert_eq!(json["power"], false);
        assert_eq!(json["temperature"], 26);
        assert_eq!(json["mode"], "cool");
        // fan_speed は camelCase の "fanSpeed" でシリアライズされる（決定1）。
        assert_eq!(json["fanSpeed"], "auto");
        assert!(json.get("brightness").is_none());
    }
}
