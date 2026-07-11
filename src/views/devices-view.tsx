import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DevicesView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>デバイス</CardTitle>
        <CardDescription>
          登録済みの SwitchBot デバイスがここに一覧表示されます。
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
