import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SecretField } from "./secret-field";

describe("SecretField", () => {
  it("Eye トグルでマスク⇔表示が切り替わる", async () => {
    render(<SecretField id="token" label="トークン" value="visible-token" />);

    const input = screen.getByLabelText("トークン") as HTMLInputElement;
    expect(input.type).toBe("password");

    await userEvent.click(screen.getByRole("button", { name: "表示" }));
    expect(input.type).toBe("text");

    await userEvent.click(screen.getByRole("button", { name: "隠す" }));
    expect(input.type).toBe("password");
  });
});
