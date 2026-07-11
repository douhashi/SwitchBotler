import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SecretFieldProps = {
  id: string;
  label: string;
  /** マスク表示する値（平文の実 Token/Secret ではなくマスク済み表示値）。 */
  value: string;
  help?: string;
};

/** Token / Secret の表示フィールド。Eye トグルでマスク⇔表示を切り替える。 */
export function SecretField({ id, label, value, help }: SecretFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-xs font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-xl bg-background pr-3 shadow-inset">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          readOnly
          className={cn(
            "border-0 bg-transparent font-mono tracking-[1.5px] shadow-none",
            "focus-visible:ring-0",
          )}
        />
        <button
          type="button"
          aria-label={visible ? "隠す" : "表示"}
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
