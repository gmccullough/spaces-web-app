"use client";

import React from "react";
import { useSpacesFileTree } from "@/app/hooks/useSpacesFileTree";
// no channel constant needed in this component

type Props = {
  spaceName?: string;
  onSelectPath?: (path: string) => void;
  includeMindMapEntry?: boolean;
};

export default function SpacesFileTree({ spaceName, onSelectPath, includeMindMapEntry = true }: Props) {
  const {
    isReady,
    expandedDirs,
    selectedPath,
    setSelectedPath,
    toggleExpand,
    ensureDir,
    getDirState,
  } = useSpacesFileTree(spaceName);

  React.useEffect(() => {
    if (isReady) ensureDir("");
  }, [isReady, ensureDir, spaceName]);

  const root = getDirState("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const items = React.useMemo(() => {
    const base = root.nodes || [];
    if (!includeMindMapEntry) return base;
    const specialMindMap = { path: "__mindmap__", name: "Mind Map", isDirectory: false } as any;
    // Prepend special entry at root
    return [specialMindMap, ...base];
  }, [root.nodes, includeMindMapEntry]);

  const moveSelection = (delta: number) => {
    if (!items.length) return;
    const idx = Math.max(0, items.findIndex((n) => n.path === selectedPath));
    const nextIdx = Math.min(items.length - 1, Math.max(0, idx + delta));
    const next = items[nextIdx];
    setSelectedPath(next.path);
    onSelectPath?.(next.path);
  };

  const getParentDir = (p: string | null): string | null => {
    if (!p) return null;
    const i = p.lastIndexOf('/');
    return i >= 0 ? p.substring(0, i) : "";
  };

  const isDirectoryPath = (p: string | null): boolean => {
    if (!p) return false;
    if (p === "__mindmap__") return false;
    const parent = getParentDir(p);
    const parentState = getDirState(parent || "");
    const name = p.substring(p.lastIndexOf('/') + 1);
    const found = (parentState.nodes || []).find((n: any) => n.name === name);
    if (found) return !!found.isDirectory;
    // Fallback: if asking for state of dir returns something, treat as dir
    const st = getDirState(p);
    return Array.isArray(st.nodes);
  };

  const handleArrowRight = async () => {
    if (!selectedPath) return;
    if (!isDirectoryPath(selectedPath)) return; // no-op on files
    const isOpen = expandedDirs.has(selectedPath);
    if (!isOpen) {
      toggleExpand(selectedPath);
      await ensureDir(selectedPath);
      return;
    }
    const childState = getDirState(selectedPath);
    const childNodes = (childState.nodes || []) as any[];
    if (!childNodes.length) return;
    const first = childNodes[0];
    setSelectedPath(first.path);
    if (!first.isDirectory) onSelectPath?.(first.path);
  };

  const handleArrowLeft = () => {
    if (!selectedPath) return;
    if (isDirectoryPath(selectedPath) && expandedDirs.has(selectedPath)) {
      toggleExpand(selectedPath);
      return;
    }
    const parent = getParentDir(selectedPath);
    if (parent === null) return;
    setSelectedPath(parent);
  };

  return (
    <div
      ref={containerRef}
      role="tree"
      aria-label="Files"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSelection(-1);
        } else if (e.key === 'Enter') {
          if (selectedPath && !isDirectoryPath(selectedPath)) onSelectPath?.(selectedPath);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleArrowRight();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleArrowLeft();
        }
      }}
      className="text-sm select-none focus:outline-none"
    >
      {!isReady && (
        <div className="p-3 text-gray-500">Sign in to view your Space files.</div>
      )}
      {isReady && root.loading && (
        <div className="p-3 text-gray-500">Loading…</div>
      )}
      {isReady && root.error && (
        <div className="p-3 text-red-600">{root.error}</div>
      )}
      {isReady && <TreeDir dir="" getDirState={getDirState} ensureDir={ensureDir} expandedDirs={expandedDirs} toggleExpand={toggleExpand} selectedPath={selectedPath} setSelectedPath={setSelectedPath} onSelectPath={onSelectPath} includeMindMapEntry={includeMindMapEntry} />}
    </div>
  );
}

type TreeDirProps = {
  dir: string;
  getDirState: (dir: string) => any;
  ensureDir: (dir: string) => Promise<void> | void;
  expandedDirs: Set<string>;
  toggleExpand: (dir: string) => void;
  selectedPath: string | null;
  setSelectedPath: (p: string) => void;
  onSelectPath?: (path: string) => void;
  includeMindMapEntry: boolean;
};

function TreeDir({ dir, getDirState, ensureDir, expandedDirs, toggleExpand, selectedPath, setSelectedPath, onSelectPath, includeMindMapEntry }: TreeDirProps) {
  React.useEffect(() => { ensureDir(dir); }, [dir, ensureDir]);
  const state = getDirState(dir);

  if (state.loading && !state.nodes) return <div className="p-3 text-gray-500">Loading…</div>;
  if (state.error) return <div className="p-3 text-red-600">{state.error}</div>;
  if (!state.nodes) return null;

  const subdirs = state.nodes.filter((n: any) => n.isDirectory);
  const files = state.nodes.filter((n: any) => !n.isDirectory);

  return (
    <ul role="group" className={dir ? "pl-4" : "p-2"}>
      {subdirs.map((d: any) => {
        const key = d.path;
        const isOpen = expandedDirs.has(key);
        return (
          <li key={key}>
            <div role="treeitem" aria-expanded={isOpen} aria-selected={false} className={`px-2 py-1 rounded cursor-pointer ${isOpen ? 'bg-blue-50' : 'hover:bg-gray-50'}`} onClick={() => toggleExpand(key)}>
              <span className="mr-1">{isOpen ? '📂' : '📁'}</span>
              {d.name}
            </div>
            {isOpen && <TreeDir dir={key} getDirState={getDirState} ensureDir={ensureDir} expandedDirs={expandedDirs} toggleExpand={toggleExpand} selectedPath={selectedPath} setSelectedPath={setSelectedPath} onSelectPath={onSelectPath} includeMindMapEntry={includeMindMapEntry} />}
          </li>
        );
      })}
      {files.map((f: any) => (
        <li key={f.path}>
          <div role="treeitem" aria-selected={selectedPath === f.path} className={`px-2 py-1 rounded cursor-pointer ${selectedPath === f.path ? 'bg-blue-50' : ''}`} onClick={() => { setSelectedPath(f.path); onSelectPath?.(f.path); }}>
            <span className="mr-1">📄</span>
            {f.name}
          </div>
        </li>
      ))}
      {/* Special virtual entry */}
      {includeMindMapEntry && dir === "" && (
        <li key="__mindmap__">
          <div role="treeitem" aria-selected={selectedPath === "__mindmap__"} className={`px-2 py-1 rounded cursor-pointer ${selectedPath === "__mindmap__" ? 'bg-blue-50' : ''}`} onClick={() => { setSelectedPath("__mindmap__"); onSelectPath?.("__mindmap__"); }}>
            <span className="mr-1">🧠</span>
            Mind Map
          </div>
        </li>
      )}
    </ul>
  );
}


