import { create } from "zustand";

import type { AppErrorCode } from "@/i18n/error";

/**
 * 一過性の通知（操作失敗のロールバック等）。id は表示中の一意キー。
 * 文言そのものでなくエラーコードを保持し、表示端（toast）が `errors` namespace で翻訳する
 * （言語切替に追従）。`statusCode` は `apiStatus` の番号補間用（任意）。
 */
export type Notice = {
  id: number;
  code: AppErrorCode;
  statusCode?: number;
};

/** 自動で消えるまでの時間（ms）。 */
const AUTO_DISMISS_MS = 4000;

type NoticeState = {
  notices: Notice[];
  /** エラーコードで通知を表示する（一定時間後に自動で消える）。 */
  notify: (code: AppErrorCode, statusCode?: number) => void;
  /** 指定の通知を消す。 */
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useNoticeStore = create<NoticeState>((set) => ({
  notices: [],
  notify: (code, statusCode) => {
    const id = nextId++;
    set((s) => ({ notices: [...s.notices, { id, code, statusCode }] }));
    setTimeout(() => {
      set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) =>
    set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
}));

/** ストア外（例: Zustand ストアの catch 節）から通知を出すためのヘルパ。 */
export function notify(code: AppErrorCode, statusCode?: number): void {
  useNoticeStore.getState().notify(code, statusCode);
}
