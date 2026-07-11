import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sparkline } from "./sparkline";

describe("Sparkline", () => {
  it("data から polyline の points を算出して描画する", () => {
    // data [0,10,20] → x: 0,60,120 / y: 23,13,3（min=0 max=20, pad=3, 高さ26）。
    const { container } = render(<Sparkline data={[0, 10, 20]} />);

    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute("points")).toBe("0,23 60,13 120,3");
  });

  it("空データでは何も描画しない", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
