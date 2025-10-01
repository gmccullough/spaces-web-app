import React from "react";
import { describe, it, expect, vi } from "vitest";

import Modal from "@/app/components/ui/Modal";
import { render, flushPromises } from "./test-utils";

describe.skip("Modal", () => {
  it("does not render when closed", () => {
    const { container, unmount } = render(
      <Modal isOpen={false} onClose={() => {}} title="Hello">
        <p>Body</p>
      </Modal>
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    unmount();
    expect(container.parentElement).toBeNull();
  });

  it("renders title and content when open", () => {
    const { unmount } = render(
      <Modal isOpen onClose={() => {}} title="Greetings">
        <p data-testid="modal-body">Body</p>
      </Modal>
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Greetings");
    expect(dialog?.textContent).toContain("Body");
    unmount();
  });

  it("calls onClose when clicking the backdrop", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal isOpen onClose={onClose} title="Backdrop" />
    );
    const backdrop = document.querySelector('[role="presentation"]') as HTMLElement;
    backdrop?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("calls onClose when pressing Escape", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal isOpen onClose={onClose} title="Keyboard" />
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("respects non-dismissible setting", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal isOpen isDismissible={false} onClose={onClose} title="Locked" />
    );
    const backdrop = document.querySelector('[role="presentation"]') as HTMLElement;
    backdrop?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
    unmount();
  });
});
