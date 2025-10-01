import React from "react";
import { describe, it, expect, vi } from "vitest";
import { GearIcon } from "@radix-ui/react-icons";

import IconButton from "@/app/components/ui/IconButton";
import { render } from "./test-utils";

describe.skip("IconButton", () => {
  it("fires onClick when enabled", () => {
    const handleClick = vi.fn();
    const { container, unmount } = render(
      <IconButton icon={<GearIcon />} ariaLabel="settings" onClick={handleClick} />
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("disables interaction when disabled", () => {
    const handleClick = vi.fn();
    const { container, unmount } = render(
      <IconButton icon={<GearIcon />} ariaLabel="settings" disabled onClick={handleClick} />
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(handleClick).not.toHaveBeenCalled();
    unmount();
  });

  it("applies active styles when isActive is true", () => {
    const { container, unmount } = render(
      <IconButton icon={<GearIcon />} ariaLabel="settings" isActive variant="ghost" />
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.className).toContain("bg-gray-200");
    unmount();
  });
});
