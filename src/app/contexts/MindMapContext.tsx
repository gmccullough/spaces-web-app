"use client";

import React, { createContext, useContext } from "react";
import { useSpacesMindMap } from "@/app/hooks/useSpacesMindMap";
import { useSpaceSelection } from "@/app/contexts/SpaceSelectionContext";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { buildMindMapSnapshot } from "@/app/lib/spaces/types";

type MindMapContextValue = ReturnType<typeof useSpacesMindMap>;

type ExposedValue = MindMapContextValue & {
  saveSnapshot: () => Promise<void>;
};

const MindMapContext = createContext<ExposedValue | undefined>(undefined);

export function MindMapProvider({ children }: { children: React.ReactNode }) {
  const value = useSpacesMindMap();
  const { selectedSpaceName, hasMadeInitialSelection } = useSpaceSelection();
  const { addTranscriptMessage } = useTranscript();
  const saveInProgressRef = React.useRef<boolean>(false);
  const askedRef = React.useRef<boolean>(false);

  // Load snapshot when space activates
  React.useEffect(() => {
    if (!hasMadeInitialSelection || !selectedSpaceName) return;
    (async () => {
      try {
        const res = await fetch(`/api/spaces/${encodeURIComponent(selectedSpaceName)}/mindmap`, { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.snapshot) value.hydrateFromSnapshot(json.snapshot);
      } catch {}
    })();
    askedRef.current = false; // reset ask on new space
  }, [selectedSpaceName, hasMadeInitialSelection]);

  // After 5 diffs, prompt to save (assistant-style message in transcript)
  React.useEffect(() => {
    if (!selectedSpaceName) return;
    if (value.diffCount >= 5 && !askedRef.current) {
      askedRef.current = true;
      try {
        const id = Math.random().toString(36).slice(2);
        addTranscriptMessage(id, 'assistant', 'I captured several new ideas. Would you like to save these ideas to the Mind Map snapshot?', false);
      } catch {}
    }
  }, [value.diffCount, selectedSpaceName, addTranscriptMessage]);

  // Build and save snapshot to API
  const saveSnapshot = React.useCallback(async () => {
    if (saveInProgressRef.current) return;
    if (!selectedSpaceName) return;
    saveInProgressRef.current = true;
    try {
      const snapshot = buildMindMapSnapshot(selectedSpaceName, { nodesByLabel: value.state.nodesByLabel, edges: value.state.edges });
      await fetch(`/api/spaces/${encodeURIComponent(selectedSpaceName)}/mindmap`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });
      // refresh local state markers
      value.hydrateFromSnapshot({ nodes: snapshot.nodes.map(n => ({ label: n.label, summary: n.summary, keywords: n.keywords, salience: n.salience })), edges: snapshot.edges.map(e => ({ sourceLabel: decodeURIComponent(e.sourceId.replace(/^n_/, '')), targetLabel: decodeURIComponent(e.targetId.replace(/^n_/, '')), relation: e.relation, confidence: e.confidence })) });
    } catch {}
    finally {
      saveInProgressRef.current = false;
    }
  }, [selectedSpaceName, value.state]);

  const exposed: ExposedValue = {
    ...value,
    saveSnapshot,
  };

  return <MindMapContext.Provider value={exposed}>{children}</MindMapContext.Provider>;
}

export function useMindMap() {
  const ctx = useContext(MindMapContext);
  if (!ctx) throw new Error("useMindMap must be used within a MindMapProvider");
  return ctx;
}


