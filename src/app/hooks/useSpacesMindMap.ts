"use client";

import React from "react";
import type { MindMapDiff, MindMapOp } from "@/app/lib/spaces/types";

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

  const applyDiff = React.useCallback((diff: MindMapDiff) => {
    if (!diff || !Array.isArray(diff.ops)) return;
    setState((prev) => applyOps(prev, diff.ops));
    setDiffCount((c) => c + 1);
  }, []);

  const resetDiffCount = React.useCallback(() => setDiffCount(0), []);

  return { state, applyDiff, diffCount, resetDiffCount } as const;
}

function applyOps(prev: MindMapState, ops: MindMapOp[]): MindMapState {
  let next = { ...prev, nodesByLabel: { ...prev.nodesByLabel }, edges: [...prev.edges] };
  for (const raw of ops) {
    const op = normalizeOp(raw);
    if (!op) continue;
    switch (op.type) {
      case 'add_node': {
        const { label, summary, keywords, salience } = op as any;
        next.nodesByLabel[label] = { label, summary, keywords, salience };
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
        // Avoid duplicate edge entries
        const exists = next.edges.some((e) => e.sourceLabel === sourceLabel && e.targetLabel === targetLabel && (e.relation || '') === (relation || ''));
        if (!exists) next.edges.push({ sourceLabel, targetLabel, relation, confidence });
        break;
      }
      case 'remove_edge': {
        const { sourceLabel, targetLabel, relation } = op as any;
        next.edges = next.edges.filter((e) => !(e.sourceLabel === sourceLabel && e.targetLabel === targetLabel && (e.relation || '') === (relation || '')));
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


