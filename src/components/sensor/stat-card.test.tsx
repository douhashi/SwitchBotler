import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SensorMetric } from "@/data";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("gauge は計測ラベル（icon から翻訳）・大数値・単位・メーターを描画する", () => {
    const metric: SensorMetric = {
      kind: "gauge",
      id: "battery",
      icon: "battery",
      value: 60,
      unit: "%",
    };
    render(<StatCard metric={metric} />);

    // ラベルは Rust ではなく icon から翻訳する（ja 既定）。
    expect(screen.getByText("バッテリー")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    // gauge は BarMeter（role="meter"）を描画する。
    expect(screen.getByRole("meter")).toBeInTheDocument();
  });

  it("state は状態キー（icon+state から翻訳）を表示しメーターを描画しない", () => {
    const metric: SensorMetric = {
      kind: "state",
      id: "motion",
      icon: "motion",
      state: "active",
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
      icon: "motion",
      state: "active",
      tone: "active",
    };
    render(<StatCard metric={metric} />);

    expect(screen.getByText("検知あり")).toHaveClass("text-sd-accent");
  });

  it("tone 無指定の state はニュートラル表示（強調色クラスなし）", () => {
    const metric: SensorMetric = {
      kind: "state",
      id: "brightness",
      icon: "brightness",
      state: "bright",
    };
    render(<StatCard metric={metric} />);

    const text = screen.getByText("明るい");
    expect(text).not.toHaveClass("text-sd-accent");
    expect(text).not.toHaveClass("text-muted-foreground");
  });
});
