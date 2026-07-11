import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("Switch と Botler が別テキストノードに分かれる", () => {
    render(<Wordmark />);
    // 造語を 2 色で組むため、Switch と Botler は別ノードに分割される。
    expect(screen.getByText("Switch")).toBeInTheDocument();
    expect(screen.getByText("Botler")).toBeInTheDocument();
  });

  it("Botler 側にインディゴのアクセントクラスが付く", () => {
    render(<Wordmark />);
    expect(screen.getByText("Botler")).toHaveClass("text-sd-accent");
    // Switch 側は前景色継承のためアクセントクラスを持たない。
    expect(screen.getByText("Switch")).not.toHaveClass("text-sd-accent");
  });

  it("className を外側コンテナへ渡せる", () => {
    render(<Wordmark className="font-bold" />);
    expect(screen.getByText("Switch")).toHaveClass("font-bold");
  });
});
