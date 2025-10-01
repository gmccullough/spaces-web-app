import React from "react";
import { describe, it, expect } from "vitest";

import Pane from "@/app/components/ui/Pane";
import { render } from "./test-utils";

describe.skip("Pane", () => {
  it("renders header, body, and footer sections", () => {
    const { container, unmount } = render(
      <Pane>
        <Pane.Header title="Activity" actions={<button data-testid="actions">Do</button>} />
        <Pane.Body>
          <p data-testid="body">Content area</p>
        </Pane.Body>
        <Pane.Footer>
          <span data-testid="footer">Footer</span>
        </Pane.Footer>
      </Pane>
    );

    const header = container.querySelector("h2");
    expect(header?.textContent).toBe("Activity");
    expect(container.querySelector('[data-testid="actions"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="body"]')?.textContent).toBe("Content area");
    expect(container.querySelector('[data-testid="footer"]')?.textContent).toBe("Footer");

    unmount();
  });

  it("supports custom header content", () => {
    const { container, unmount } = render(
      <Pane>
        <Pane.Header>
          <span data-testid="custom">Custom</span>
        </Pane.Header>
        <Pane.Body>
          <div />
        </Pane.Body>
      </Pane>
    );

    expect(container.querySelector('[data-testid="custom"]')).toBeTruthy();
    unmount();
  });
});
