import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Scene } from "@/data";
import { SceneRow } from "./scene-row";

const scene: Scene = {
  id: "goodnight",
  name: "おやすみ",
  description: "照明オフ・カーテン閉・加湿器オン",
  icon: "sleep",
};

describe("SceneRow", () => {
  it("実行ボタンで実行中フィードバックを表示し、完了後に戻る", async () => {
    render(<SceneRow scene={scene} />);

    await userEvent.click(screen.getByRole("button", { name: "実行" }));

    const running = screen.getByRole("button", { name: "実行中" });
    expect(running).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "実行" })).toBeEnabled();
    });
  });
});
