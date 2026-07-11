import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SensorMetric } from "@/data";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("gauge は大数値・単位・メーターを描画する", () => {
    const metric: SensorMetric = {
      kind: "gauge",
      id: "battery",
      label: "バッテリー",
      icon: "battery",
      value: 60,
      unit: "%",
    };
    render(<StatCard metric={metric} />);

    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    // gauge は BarMeter（role="meter"）を描画する。
    expect(screen.getByRole("meter")).toBeInTheDocument();
  });

  it("state は区分テキストを表示しメーターを描画しない", () => {
    const metric: SensorMetric = {
      kind: "state",
      id: "motion",
      label: "人感",
      icon: "motion",
      text: "検知あり",
      tone: "active",
    };
    render(<StatCard metric={metric} />);

    expect(screen.getByText("検知あり")).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });

  it("state の active tone は sd-accent で強調する", () => {
    const metric: SensorMetric = {
      kind: "state",
      id: "motion",
      label: "人感",
      icon: "motion",
      text: "検知あり",
      tone: "active",
    };
    render(<StatCard metric={metric} />);

    expect(screen.getByText("検知あり")).toHaveClass("text-sd-accent");
  });

  it("tone 無指定の state はニュートラル表示（強調色クラスなし）", () => {
    const metric: SensorMetric = {
      kind: "state",
      id: "brightness",
      label: "明るさ",
      icon: "brightness",
      text: "明るい",
    };
    render(<StatCard metric={metric} />);

    const text = screen.getByText("明るい");
    expect(text).not.toHaveClass("text-sd-accent");
    expect(text).not.toHaveClass("text-muted-foreground");
  });
});
