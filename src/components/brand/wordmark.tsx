/**
 * SwitchBotler ワードマーク。造語であることを色で示す 2 色表記。
 * `Switch` は前景色を継承（地に馴染む）、`Botler` は常にインディゴ（text-sd-accent）。
 *
 * brand.md では「Botler = --accent」と規定するが、実アプリ CSS では --accent が
 * shadcn のサーフェス色に再割当てされているため、インディゴを表す --sd-accent
 * （Tailwind: text-sd-accent）を用いる（意味的に一致）。
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      Switch<span className="text-sd-accent">Botler</span>
    </span>
  );
}
