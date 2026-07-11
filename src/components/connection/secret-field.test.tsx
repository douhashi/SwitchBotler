import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SecretField } from "./secret-field";

/** onChange をローカル state に結ぶ薄いラッパ（実利用と同じ制御入力の形）。 */
function Harness({ saved = false }: { saved?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <SecretField id="token" label="トークン" value={value} onChange={setValue} saved={saved} />
  );
}

describe("SecretField", () => {
  it("入力すると値が反映され、Eye トグルでマスク⇔表示が切り替わる", async () => {
    render(<Harness />);

    const input = screen.getByLabelText("トークン") as HTMLInputElement;
    expect(input.type).toBe("password");

    await userEvent.type(input, "my-token");
    expect(input.value).toBe("my-token");

    await userEvent.click(screen.getByRole("button", { name: "表示" }));
    expect(input.type).toBe("text");

    await userEvent.click(screen.getByRole("button", { name: "隠す" }));
    expect(input.type).toBe("password");
  });

  it("保存済みかつ未入力なら固定マスクのプレースホルダと「保存済み」バッジを出す", () => {
    render(<Harness saved />);

    expect(screen.getByText("保存済み")).toBeInTheDocument();
    const input = screen.getByLabelText("トークン") as HTMLInputElement;
    // 実際の秘匿値ではなく固定ドットのみをプレースホルダに出す。
    expect(input.placeholder).toMatch(/^•+$/);
    expect(input.value).toBe("");
  });
});
