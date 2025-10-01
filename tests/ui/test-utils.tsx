import React from "react";
import { createRoot, Root } from "react-dom/client";

export function render(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(ui);
  return {
    container,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

export async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
