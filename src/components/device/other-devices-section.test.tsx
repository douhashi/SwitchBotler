import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Device } from "@/data";
import { OtherDevicesSection } from "./other-devices-section";

const hub: Device = {
  id: "hub-mini",
  name: "リビングのハブ",
  model: "Hub Mini",
  category: "other",
  supported: false,
  controls: { power: false },
};

const tvRemote: Device = {
  id: "tv-remote",
  name: "テレビ",
  model: "TV",
  category: "other",
  supported: false,
  controls: { power: false },
};

describe("OtherDevicesSection", () => {
  it("対象が空なら何も描画しない", () => {
    const { container } = render(<OtherDevicesSection devices={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("既定は折りたたみで、見出しに件数を出し中身は隠す", () => {
    render(<OtherDevicesSection devices={[hub, tvRemote]} />);

    // 見出し（トリガ）は「未対応のデバイス (2)」。
    const trigger = screen.getByRole("button", { name: /未対応/ });
    expect(trigger).toHaveTextContent("未対応");
    expect(trigger).toHaveTextContent("(2)");
    expect(trigger).toHaveAttribute("data-state", "closed");

    // 折りたたみ中は各行は表示されない。
    expect(screen.queryByText("リビングのハブ")).toBeNull();
    expect(screen.queryByText("テレビ")).toBeNull();
  });

  it("見出しクリックで展開し「未対応」デバイス行を表示する", async () => {
    render(<OtherDevicesSection devices={[hub, tvRemote]} />);

    await userEvent.click(screen.getByRole("button", { name: /未対応/ }));

    // 展開後は各行（名前＋モデル）が表示される。
    expect(screen.getByText("リビングのハブ")).toBeInTheDocument();
    expect(screen.getByText("Hub Mini")).toBeInTheDocument();
    expect(screen.getByText("テレビ")).toBeInTheDocument();
    expect(screen.getByText("TV")).toBeInTheDocument();

    // 操作要素・お気に入りピンは持たない（読み取り専用）。
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: /お気に入り/ })).toBeNull();
  });
});
