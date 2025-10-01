import React from "react";
import { describe, it, expect, vi } from "vitest";

import ToggleGroup from "@/app/components/ui/ToggleGroup";
import { render } from "./test-utils";

describe.skip("ToggleGroup", () => {
  function Harness({ onChange }: { onChange?: (value: string) => void }) {
    const [value, setValue] = React.useState("auto");
    return (
      <ToggleGroup
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        options={[
          { value: "auto", label: "Auto" },
          { value: "manual", label: "Manual" },
          { value: "custom", label: "Custom" },
        ]}
        ariaLabel="Modes"
      />
    );
  }

  it("invokes onChange when clicking an option", () => {
    const handleChange = vi.fn();
    const { container, unmount } = render(<Harness onChange={handleChange} />);
    const buttons = Array.from(container.querySelectorAll('button[role="radio"]')) as HTMLButtonElement[];
    expect(buttons).toHaveLength(3);
    buttons[1].click();
    expect(handleChange).toHaveBeenCalledWith("manual");
    expect(buttons[1].getAttribute("aria-checked")).toBe("true");
    unmount();
  });

  it("supports arrow key navigation", () => {
    const { container, unmount } = render(<Harness />);
    const buttons = Array.from(container.querySelectorAll('button[role="radio"]')) as HTMLButtonElement[];
    const first = buttons[0];
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(buttons[1].getAttribute("aria-checked")).toBe("true");
    buttons[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(buttons[0].getAttribute("aria-checked")).toBe("true");
    unmount();
  });
});
