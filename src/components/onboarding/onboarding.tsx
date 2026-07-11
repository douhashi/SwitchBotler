import { useState } from "react";
import { Save, ShieldCheck, TriangleAlert } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/brand";
import { SecretField } from "@/components/connection/secret-field";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/stores/connection-store";

/** モックアップ 01 準拠の取得手順。文言は SwitchBot アプリの導線に合わせる。 */
const STEPS = [
  {
    title: "アプリで発行",
    body: "SwitchBot アプリ → プロフィール → 設定 → 開発者向けオプション",
  },
  {
    title: "2つの値をコピー",
    body: "トークンとシークレットをそれぞれコピーします。",
  },
  {
    title: "貼り付けて接続",
    body: "下のフォームに貼り付け、「保存して接続」。",
  },
] as const;

/**
 * 未設定（`connection.saved === false`）のときにサイドバー付きシェルの代わりに出す
 * メニューなしの全画面オンボーディング。1 画面で「知る → 取得 → 接続」を完結させる。
 *
 * 接続成功で store の `connection.saved` が true になると `App` が再描画され、
 * 通常シェルへ自動遷移する（このコンポーネントは遷移を持たない）。
 */
export function Onboarding() {
  const connection = useConnectionStore((s) => s.connection);
  const error = useConnectionStore((s) => s.error);
  const saveCredentials = useConnectionStore((s) => s.saveCredentials);

  // 平文の Token / Secret はこのコンポーネントのローカル state にのみ一時保持し、保存後にクリアする。
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");

  const testing = connection.status === "testing";
  const canSave = token.length > 0 && secret.length > 0 && !testing;

  const handleSave = async () => {
    await saveCredentials(token, secret);
    // 保存に成功したら平文を破棄する（失敗時も残さない）。
    setToken("");
    setSecret("");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-[16px] bg-card text-sd-accent shadow-raise-sm">
            <LogoMark size={30} />
          </span>
          <h1 className="mb-2 text-[22px] font-bold tracking-tight">
            <Wordmark /> へようこそ
          </h1>
          <p className="max-w-[42ch] text-[13.5px] leading-relaxed text-muted-foreground">
            お使いの SwitchBot デバイスを、メニューバーからワンタップで操作できます。はじめに
            API 認証を設定しましょう。
          </p>
        </div>

        <ol className="my-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[15px] px-3.5 py-3.5 shadow-inset-sm"
            >
              <span className="mb-2.5 grid size-6 place-items-center rounded-full font-mono text-xs font-bold text-sd-accent shadow-raise-sm">
                {index + 1}
              </span>
              <h2 className="mb-1 text-[12.5px] font-bold">{step.title}</h2>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        {error && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs text-destructive shadow-inset-sm">
            <TriangleAlert size={15} strokeWidth={1.9} className="shrink-0" />
            {error}
          </div>
        )}

        <SecretField
          id="token"
          label="トークン"
          value={token}
          onChange={setToken}
          saved={false}
        />
        <SecretField
          id="secret"
          label="シークレット"
          value={secret}
          onChange={setSecret}
          saved={false}
        />

        <div className="mb-5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[11.5px] leading-relaxed text-muted-foreground shadow-inset-sm">
          <ShieldCheck
            size={15}
            strokeWidth={1.75}
            className="mt-0.5 shrink-0 text-sd-ok"
          />
          入力した値は OS のセキュアストレージ（Keychain / Credential Manager / Secret
          Service）に保管され、画面やログに平文で表示されません。
        </div>

        <Button className="w-full" onClick={handleSave} disabled={!canSave}>
          <Save strokeWidth={2} />
          保存して接続
        </Button>
      </div>
    </div>
  );
}
