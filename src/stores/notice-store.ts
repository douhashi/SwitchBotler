import { create } from "zustand";

/** 一過性の通知（操作失敗のロールバック等）。id は表示中の一意キー。 */
export type Notice = {
  id: number;
  message: string;
};

/** 自動で消えるまでの時間（ms）。 */
const AUTO_DISMISS_MS = 4000;

type NoticeState = {
  notices: Notice[];
  /** メッセージを表示する（一定時間後に自動で消える）。 */
  notify: (message: string) => void;
  /** 指定の通知を消す。 */
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useNoticeStore = create<NoticeState>((set) => ({
  notices: [],
  notify: (message) => {
    const id = nextId++;
    set((s) => ({ notices: [...s.notices, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) =>
    set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
}));

/** ストア外（例: Zustand ストアの catch 節）から通知を出すためのヘルパ。 */
export function notify(message: string): void {
  useNoticeStore.getState().notify(message);
}
