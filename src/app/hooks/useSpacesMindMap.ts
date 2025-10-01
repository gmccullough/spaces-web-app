"use client";

import React from "react";
import type { MindMapDiff, MindMapOp } from "@/app/lib/spaces/types";
import { mindMapDiffJsonSchema } from "@/app/lib/spaces/types";

export type MindMapNode = {
  label: string;
  summary?: string;
  keywords?: string[];
  salience?: number; // 1-10
};

export type MindMapEdge = {
  sourceLabel: string;
  targetLabel: string;
  relation?: string;
  confidence?: number;
};

export type MindMapState = {
  nodesByLabel: Record<string, MindMapNode>;
  edges: MindMapEdge[];
};

export function useSpacesMindMap() {
  const [state, setState] = React.useState<MindMapState>(() => ({ nodesByLabel: {}, edges: [] }));
  const [diffCount, setDiffCount] = React.useState<number>(0);
  const edgeKeySetRef = React.useRef<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);

  const applyDiff = React.useCallback((diff: MindMapDiff) => {
    if (!diff || !Array.isArray(diff.ops)) return;
    // Validate against schema (best-effort)
    try {
      if (!validateDiff(diff)) return;
    } catch {}
    setState((prev) => applyOps(prev, diff.ops, edgeKeySetRef.current));
    setDiffCount((c) => c + 1);
  }, []);

  const resetDiffCount = React.useCallback(() => setDiffCount(0), []);

  const hydrateFromSnapshot = React.useCallback((snapshot: { nodes: Array<{ label: string; summary?: string; keywords?: string[]; salience?: number }>; edges: Array<{ sourceLabel: string; targetLabel: string; relation?: string; confidence?: number }> } | null) => {
    const next: MindMapState = { nodesByLabel: {}, edges: [] };
    edgeKeySetRef.current.clear();
    if (snapshot) {
      for (const n of snapshot.nodes || []) {
        next.nodesByLabel[n.label] = { label: n.label, summary: n.summary, keywords: n.keywords, salience: n.salience };
      }
      for (const e of snapshot.edges || []) {
        const key = edgeKey(e.sourceLabel, e.targetLabel, e.relation);
        if (!edgeKeySetRef.current.has(key)) {
          edgeKeySetRef.current.add(key);
          next.edges.push({ sourceLabel: e.sourceLabel, targetLabel: e.targetLabel, relation: e.relation, confidence: e.confidence });
        }
      }
    }
    setState(next);
    setDiffCount(0);
    setLastSavedAt(new Date().toISOString());
  }, []);

  return { state, applyDiff, diffCount, resetDiffCount, hydrateFromSnapshot, lastSavedAt } as const;
}

function applyOps(prev: MindMapState, ops: MindMapOp[], edgeKeySet?: Set<string>): MindMapState {
  const next = { ...prev, nodesByLabel: { ...prev.nodesByLabel }, edges: [...prev.edges] };
  const keys = edgeKeySet ?? new Set<string>(next.edges.map((e) => edgeKey(e.sourceLabel, e.targetLabel, e.relation)));
  for (const raw of ops) {
    const op = normalizeOp(raw);
    if (!op) continue;
    switch (op.type) {
      case 'add_node': {
        const { label, summary, keywords, salience } = op as any;
        // Label collision policy: add_node acts like update when label exists
        const existing = next.nodesByLabel[label];
        if (existing) {
          next.nodesByLabel[label] = { ...existing, summary, keywords, salience };
        } else {
          next.nodesByLabel[label] = { label, summary, keywords, salience };
        }
        break;
      }
      case 'update_node': {
        const { label, summary, keywords, salience } = op as any;
        const existing = next.nodesByLabel[label] ?? { label };
        next.nodesByLabel[label] = { ...existing, summary, keywords, salience };
        break;
      }
      case 'add_edge': {
        const { sourceLabel, targetLabel, relation, confidence } = op as any;
        const key = edgeKey(sourceLabel, targetLabel, relation);
        if (!keys.has(key)) {
          keys.add(key);
          next.edges.push({ sourceLabel, targetLabel, relation, confidence });
        }
        break;
      }
      case 'remove_edge': {
        const { sourceLabel, targetLabel, relation } = op as any;
        const key = edgeKey(sourceLabel, targetLabel, relation);
        if (keys.has(key)) keys.delete(key);
        next.edges = next.edges.filter((e) => edgeKey(e.sourceLabel, e.targetLabel, e.relation) !== key);
        break;
      }
    }
  }
  return next;
}

function normalizeOp(raw: any): MindMapOp | undefined {
  if (!raw || typeof raw !== 'object') return undefined as any;
  if ((raw as any).type) return raw as any;
  const nestedKey = Object.keys(raw)[0];
  const val = (raw as any)[nestedKey];
  if (nestedKey && val && typeof val === 'object') {
    return { type: nestedKey, ...val } as any;
  }
  return undefined;
}

function edgeKey(a?: string, b?: string, relation?: string): string {
  return `${a ?? ''}→${b ?? ''}#${relation ?? ''}`;
}

function validateDiff(diff: MindMapDiff): boolean {
  try {
    // Basic structural checks first
    if (!diff || typeof diff !== 'object' || !Array.isArray(diff.ops)) return false;
    // Soft validation against schema title; skip heavy validation libs for now
    const title = mindMapDiffJsonSchema?.title;
    if (title !== 'mindmap_diff_v1') return true; // schema not aligned; don't block
    // Quick pass: ensure each op has type
    for (const raw of diff.ops) {
      const op = normalizeOp(raw);
      if (!op || !('type' in op)) return false;
    }
    return true;
  } catch {
    return false;
  }
}


