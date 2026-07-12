import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Slider } from "./slider";

// rangeClassName 未指定で既定 bg-primary のまま / 指定時のみ fill 色を上書きする。
describe("Slider rangeClassName", () => {
  it("未指定なら Range は bg-primary のまま", () => {
    const { container } = render(<Slider value={[50]} min={0} max={100} />);
    const range = container.querySelector('[data-slot="slider-range"]');
    expect(range?.className).toContain("bg-primary");
    expect(range?.className).not.toContain("var(--m)");
  });

  it("指定すると Range の塗り色が上書きされる", () => {
    const { container } = render(
      <Slider value={[50]} min={0} max={100} rangeClassName="bg-[var(--m)]" />,
    );
    const range = container.querySelector('[data-slot="slider-range"]');
    expect(range?.className).toContain("bg-[var(--m)]");
  });
});
