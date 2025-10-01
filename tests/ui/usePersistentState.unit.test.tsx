import React from "react";
import { describe, it, expect } from "vitest";

import { usePersistentState } from "@/app/lib/ui/usePersistentState";
import { render, flushPromises } from "./test-utils";

const STORAGE_KEY = "unit:test:persistent";

function Harness() {
  const [value, setValue] = usePersistentState<string>(STORAGE_KEY, "default");
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button data-testid="set" onClick={() => setValue("updated")}>Set</button>
    </div>
  );
}

describe.skip("usePersistentState", () => {
  it("initializes from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify("stored"));
    const { container, unmount } = render(<Harness />);
    expect(container.querySelector('[data-testid="value"]')?.textContent).toBe("stored");
    unmount();
  });

  it("writes value changes to localStorage", () => {
    const { container, unmount } = render(<Harness />);
    const button = container.querySelector('[data-testid="set"]') as HTMLButtonElement;
    button.click();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify("updated"));
    unmount();
  });

  it("reacts to storage events from other tabs", async () => {
    const { container, unmount } = render(<Harness />);
    const event = new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: JSON.stringify("remote"),
      storageArea: window.localStorage,
    });
    window.dispatchEvent(event);
    await flushPromises();
    expect(container.querySelector('[data-testid="value"]')?.textContent).toBe("remote");
    unmount();
  });
});
