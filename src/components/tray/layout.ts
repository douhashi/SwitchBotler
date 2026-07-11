/**
 * トレイウィンドウのレイアウト定数と純粋関数（SSoT）。
 *
 * `tray-app`（ウィンドウサイズ）・`tray-popover`（各リストのスクロール上限）・
 * `scroll-region`（下端フェード判定）が共有する。マジックナンバーを各所に散らさず、
 * 高さの上限は式で明示する（決定: 選択肢 A / B）。
 */

/** ウィンドウ幅（論理px）。ウィンドウの 1 列カード相当（決定変更で 306 → 360）。 */
export const TRAY_WIDTH = 360;

/** お気に入りデバイスリストのスクロール上限（論理px, ≒6 行）。 */
export const DEVICE_MAX_HEIGHT = 300;

/** お気に入りシーンリストのスクロール上限（論理px, ≒3 行）。 */
export const SCENE_MAX_HEIGHT = 150;

/** 固定 chrome（ヘッダ / シーン見出し / 区切り線 / フッタ / 余白）の高さ許容（論理px）。 */
export const CHROME_ALLOWANCE = 150;

/**
 * ウィンドウ高さの安全弁（論理px）。
 *
 * 主機構は内側リストの px 上限（{@link DEVICE_MAX_HEIGHT} / {@link SCENE_MAX_HEIGHT}）で、
 * 本値はそれらと固定 chrome の合計を上限とする安全弁。マジックナンバーで別々に置かず式で示す。
 */
export const MAX_TRAY_HEIGHT =
  DEVICE_MAX_HEIGHT + SCENE_MAX_HEIGHT + CHROME_ALLOWANCE;

/** 内容高さをウィンドウ上限にクランプする。 */
export function clampHeight(content: number, max: number): number {
  return Math.min(content, max);
}

/**
 * 下端フェードを出すべきか（決定: 選択肢 B = 続きがある時のみ・下端のみ）。
 *
 * スクロール最下端に到達したら消す。subpixel 由来の端数で消え残らないよう 1px の許容を持つ。
 */
export function shouldShowFade(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): boolean {
  return scrollTop + clientHeight < scrollHeight - 1;
}
