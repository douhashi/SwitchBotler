import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 保存済みを示す固定マスク（秘匿値の一部も返さない）。 */
const SAVED_MASK = "••••••••••••••••••••••••";

type SecretFieldProps = {
  id: string;
  label: string;
  /** 編集中の平文（保存前の一時値）。保存後は空に戻す。 */
  value: string;
  onChange: (value: string) => void;
  /** keyring に保存済みか。保存済みかつ未入力なら固定マスク + バッジを表示する。 */
  saved: boolean;
  help?: string;
};

/**
 * Token / Secret の入力フィールド。
 *
 * - 入力値（平文）は親のローカル state に一時保持され、保存後にクリアされる。
 * - 保存済みかつ未入力のときは固定ドットのプレースホルダと「保存済み」バッジを出す。
 *   実際の秘匿値（末尾等を含む）は WebView に一切渡さない。
 */
export function SecretField({ id, label, value, onChange, saved, help }: SecretFieldProps) {
  const { t } = useTranslation("connection");
  const [visible, setVisible] = useState(false);
  const showSavedMask = saved && value === "";

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <label htmlFor={id} className="block text-xs font-medium">
          {label}
        </label>
        {saved && (
          <Badge variant="secondary" className="text-sd-ok">
            {t("field.saved")}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-background pr-3 shadow-inset">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={showSavedMask ? SAVED_MASK : undefined}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "border-0 bg-transparent font-mono tracking-[1.5px] shadow-none",
            "focus-visible:ring-0",
          )}
        />
        <button
          type="button"
          aria-label={visible ? t("field.hide") : t("field.show")}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="grid shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? (
            <EyeOff size={17} strokeWidth={1.75} />
          ) : (
            <Eye size={17} strokeWidth={1.75} />
          )}
        </button>
      </div>
      {help && <p className="mt-2 px-0.5 text-[11.5px] text-muted-foreground">{help}</p>}
    </div>
  );
}
