"use client";

import React from "react";
import { FileSavedEvent } from "@/app/contexts/EventContext";
import { listSpaceFiles } from "@/app/lib/spaces/client";
import { useSpaceFileSaved } from "@/app/lib/spaces/useSpaceFileSaved";

export type TreeNode = {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
  contentType?: string;
  updatedAt?: string;
};

type DirState = {
  loading: boolean;
  error?: string;
  nodes?: TreeNode[];
};

export function useSpacesFileTree(spaceName: string | undefined) {
  const [expandedDirs, setExpandedDirs] = React.useState<Set<string>>(new Set());
  const [dirStates, setDirStates] = React.useState<Record<string, DirState>>({});
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [spaces, setSpaces] = React.useState<string[]>([]);

  const isReady = Boolean(spaceName);

  // Reset cache when space changes
  React.useEffect(() => {
    setExpandedDirs(new Set());
    setDirStates({});
    setSelectedPath(null);
  }, [spaceName]);

  // Load top-level spaces list
  React.useEffect(() => {
    let cancelled = false;
    async function loadSpaces() {
      try {
        const res = await fetch('/api/spaces');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setSpaces(Array.isArray(json.spaces) ? json.spaces : []);
      } catch {
        // ignore
      }
    }
    loadSpaces();
    return () => { cancelled = true; };
  }, []);

  // NOTE: event listener effect is placed after ensureDir definition to avoid TDZ

  const ensureDir = React.useCallback(async (dir: string, force?: boolean) => {
    if (!isReady) return;
    const key = dir || "";
    const current = dirStates[key];
    if (current?.loading) return;
    if (!force && current?.nodes) return;
    setDirStates((s) => ({ ...s, [key]: { loading: true } }));
    const res = await listSpaceFiles(spaceName!, { dir, recursive: false });
    if ((res as any).error) {
      setDirStates((s) => ({ ...s, [key]: { loading: false, error: (res as any).error.message || "Error" } }));
      return;
    }
    const items = (res as any).files as Array<{ path: string; name: string; size: number; contentType?: string; updatedAt?: string; isDirectory?: boolean }>;
    const nodes: TreeNode[] = items.map((it) => ({
      path: it.isDirectory ? normalizeDirPath(it.path) : it.path,
      name: it.name,
      isDirectory: Boolean(it.isDirectory),
      size: it.size,
      contentType: it.contentType,
      updatedAt: it.updatedAt,
    }));
    setDirStates((s) => ({ ...s, [key]: { loading: false, nodes } }));
  }, [spaceName, isReady, dirStates]);

  const toggleExpand = React.useCallback(async (dir: string) => {
    const key = dir || "";
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    if (!(dirStates[key]?.nodes)) {
      await ensureDir(dir);
    }
  }, [dirStates, ensureDir]);

  const getDirState = React.useCallback((dir: string) => dirStates[dir || ""] || { loading: false }, [dirStates]);

  useSpaceFileSaved(
    spaceName,
    React.useCallback(
      async (detail: FileSavedEvent) => {
        try {
          await ensureDir("", true);
          const parent = getParentDir(detail.path);
          if (parent !== null) await ensureDir(parent, true);
        } catch {}
      },
      [ensureDir]
    ),
    { debounceMs: 150 }
  );

  return {
    isReady,
    spaces,
    expandedDirs,
    selectedPath,
    setSelectedPath,
    toggleExpand,
    ensureDir,
    getDirState,
  };
}

function normalizeDirPath(p: string): string {
  return p.endsWith('/') ? p.slice(0, -1) : p;
}

function getParentDir(p: string | null): string | null {
  if (!p) return null;
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.substring(0, i) : "";
}
