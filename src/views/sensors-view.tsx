import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SensorsView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>センサー</CardTitle>
        <CardDescription>
          温湿度などのセンサーステータスがここに表示されます。
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
