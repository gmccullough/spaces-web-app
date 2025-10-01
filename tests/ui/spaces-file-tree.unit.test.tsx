import React from "react";
import { describe, it, expect, vi } from "vitest";

const nodes = [
  { path: "docs/a.txt", name: "a.txt", isDirectory: false },
  { path: "docs/b.txt", name: "b.txt", isDirectory: false },
];

vi.mock("@/app/hooks/useSpacesFileTree", () => {
  const React = require("react");
  return {
    useSpacesFileTree: () => {
      const [selectedPath, setSelectedPath] = React.useState<string | null>(nodes[0].path);
      return {
        isReady: true,
        spaces: [],
        expandedDirs: new Set<string>(),
        selectedPath,
        setSelectedPath,
        toggleExpand: vi.fn(),
        ensureDir: vi.fn(),
        getDirState: (dir: string) => {
          if (dir === "") return { nodes };
          return { nodes: [] };
        },
      };
    },
  };
});

import SpacesFileTree from "@/app/components/SpacesFileTree";
import { render } from "./test-utils";

describe.skip("SpacesFileTree", () => {
  it("supports keyboard navigation", () => {
    const { container, unmount } = render(
      <SpacesFileTree spaceName="demo" includeMindMapEntry={false} />
    );

    const tree = container.querySelector('[role="tree"]') as HTMLElement;
    expect(tree).toBeTruthy();
    tree.focus?.();
    tree.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const selected = container.querySelector('[role="treeitem"][aria-selected="true"]');
    expect(selected?.textContent).toContain("b.txt");
    tree.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    const selectedAfterUp = container.querySelector('[role="treeitem"][aria-selected="true"]');
    expect(selectedAfterUp?.textContent).toContain("a.txt");

    unmount();
  });
});
