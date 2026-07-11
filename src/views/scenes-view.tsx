import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ScenesView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>シーン</CardTitle>
        <CardDescription>
          登録済みのシーンをワンクリックで実行できます。
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
