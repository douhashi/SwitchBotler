import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Save, ShieldCheck, TriangleAlert, X } from "lucide-react";

import { ConnectionBanner } from "@/components/connection/connection-banner";
import { LanguageSelect } from "@/components/language-select";
import { SecretField } from "@/components/connection/secret-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeSegment } from "@/components/theme-segment";
import { ViewHeader } from "@/components/view-header";
import { isAutostartEnabled, setAutostart } from "@/data/autostart";
import { useConnectionStore } from "@/stores/connection-store";

export function SettingsView() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { t: tconn } = useTranslation("connection");
  const { t: te } = useTranslation("errors");
  const connection = useConnectionStore((s) => s.connection);
  const error = useConnectionStore((s) => s.error);
  const load = useConnectionStore((s) => s.load);
  const saveCredentials = useConnectionStore((s) => s.saveCredentials);
  const testConnection = useConnectionStore((s) => s.testConnection);
  const disconnect = useConnectionStore((s) => s.disconnect);

  // 平文の Token / Secret はこの view のローカル state にのみ一時保持し、保存後にクリアする。
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");

  // ログイン時に起動（OS のログイン項目）の現在状態。マウント時に実状態を反映する。
  const [autostart, setAutostartState] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    isAutostartEnabled().then(setAutostartState);
  }, []);

  const handleAutostartChange = async (next: boolean) => {
    // 楽観更新 → 実行 → 再取得で確定。失敗時は元状態へロールバックする。
    setAutostartState(next);
    try {
      await setAutostart(next);
      setAutostartState(await isAutostartEnabled());
    } catch {
      setAutostartState(!next);
    }
  };

  const testing = connection.status === "testing";
  const canSave = token.length > 0 && secret.length > 0 && !testing;

  const handleSave = async () => {
    await saveCredentials(token, secret);
    // 保存に成功したら平文を破棄する（失敗時も残さない）。
    setToken("");
    setSecret("");
  };

  return (
    <div>
      <ViewHeader title={t("title")} subtitle={t("subtitle")} />

      <section className="mb-6">
        <h2 className="mb-2.5 px-0.5 text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
          {t("display.heading")}
        </h2>
        <span className="mb-2 block text-xs font-medium">
          {t("display.theme")}
        </span>
        <ThemeSegment />
        <p className="mt-2 mb-4 px-0.5 text-[11.5px] text-muted-foreground">
          {t("display.themeHint")}
        </p>
        <span className="mb-2 block text-xs font-medium">
          {tc("language.label")}
        </span>
        <LanguageSelect />
      </section>

      <section className="mb-6">
        <h2 className="mb-2.5 px-0.5 text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
          {t("launch.heading")}
        </h2>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="autostart" className="text-xs font-medium">
            {t("launch.launchAtLogin.label")}
          </label>
          <Switch
            id="autostart"
            checked={autostart}
            onCheckedChange={handleAutostartChange}
          />
        </div>
        <p className="mt-2 px-0.5 text-[11.5px] text-muted-foreground">
          {t("launch.launchAtLogin.hint")}
        </p>
      </section>

      <h2 className="mb-2.5 px-0.5 text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
        {t("api.heading")}
      </h2>
      <ConnectionBanner connection={connection} />

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs text-destructive shadow-inset-sm">
          <TriangleAlert size={15} strokeWidth={1.9} className="shrink-0" />
          {te(error)}
        </div>
      )}

      <SecretField
        id="token"
        label={tconn("field.token")}
        value={token}
        onChange={setToken}
        saved={connection.saved}
      />
      <SecretField
        id="secret"
        label={tconn("field.secret")}
        value={secret}
        onChange={setSecret}
        saved={connection.saved}
        help={tconn("field.secretHelp")}
      />

      <div className="mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs text-muted-foreground shadow-inset-sm">
        <ShieldCheck size={15} strokeWidth={1.75} className="shrink-0 text-sd-ok" />
        {t("api.storageNote")}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button onClick={handleSave} disabled={!canSave}>
          <Save strokeWidth={2} />
          {tconn("saveAndConnect")}
        </Button>

        <Button variant="secondary" onClick={testConnection} disabled={testing || !connection.saved}>
          <ArrowRight strokeWidth={2} />
          {testing ? t("api.testing") : t("api.test")}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!connection.saved}>
              <X strokeWidth={2} />
              {t("api.disconnect")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("disconnectDialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("disconnectDialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={disconnect}>
                {t("disconnectDialog.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
