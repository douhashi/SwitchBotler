import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>設定</CardTitle>
        <CardDescription>
          認証トークンやアプリ全体の設定をここで管理します。
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
