import React from "react";
import { describe, it, expect } from "vitest";

import { ToastProvider, useToast } from "@/app/components/ui/ToastProvider";
import { render, flushPromises } from "./test-utils";

function ToastHarness() {
  const { showToast, dismissToast } = useToast();
  return (
    <div>
      <button
        data-testid="show-toast"
        onClick={() =>
          showToast({ id: "test", title: "Saved", description: "File", duration: Infinity })
        }
      >
        Show
      </button>
      <button data-testid="hide-toast" onClick={() => dismissToast("test")}>Hide</button>
    </div>
  );
}

describe.skip("ToastProvider", () => {
  it("queues and dismisses toasts", async () => {
    const { container, unmount } = render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    const showButton = container.querySelector('[data-testid="show-toast"]') as HTMLButtonElement;
    showButton.click();
    await flushPromises();
    const toast = Array.from(document.querySelectorAll("div"))
      .find((el) => el.textContent?.includes("Saved"));
    expect(toast).toBeTruthy();

    const hideButton = container.querySelector('[data-testid="hide-toast"]') as HTMLButtonElement;
    hideButton.click();
    await flushPromises();
    const toastAfterHide = Array.from(document.querySelectorAll("div"))
      .find((el) => el.textContent?.includes("Saved"));
    expect(toastAfterHide).toBeUndefined();

    unmount();
  });
});
