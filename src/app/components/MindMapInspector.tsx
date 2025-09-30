"use client";

import React from "react";
import { useEvent } from "@/app/contexts/EventContext";

type MindMapInspectorProps = {
  isOpen: boolean;
  onClose: () => void;
};

function pretty(obj: any) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

export default function MindMapInspector({ isOpen, onClose }: MindMapInspectorProps) {
  const { loggedEvents } = useEvent();
  const [activeTab, setActiveTab] = React.useState<'context'|'diff'|'json'>('context');

  // Very first version: scan recent events for response.create and response.completed payloads.
  const latestContext = React.useMemo(() => {
    const rev = [...loggedEvents].reverse();
    // Find most recent client response.create that includes instructions/messages
    const found = rev.find((e) => e.direction === 'client' && e.eventName.startsWith('response.create'));
    return found?.eventData ?? {};
  }, [loggedEvents]);

  const latestJson = React.useMemo(() => {
    const rev = [...loggedEvents].reverse();
    // Find most recent server response.completed or transport with payload
    const found = rev.find((e) => e.direction === 'server' && (e.eventName.includes('response') || e.eventName.includes('transport')));
    const payload = found?.eventData ?? {};
    // If the payload is a message with audio transcript text, try to parse JSON from it
    try {
      const content = payload?.response?.output?.[0]?.content?.[0];
      if (content?.type === 'input_text' && typeof content?.text === 'string') {
        return JSON.parse(content.text);
      }
      if (content?.type === 'text' && typeof content?.text === 'string') {
        return JSON.parse(content.text);
      }
      if (content?.type === 'audio' && typeof content?.transcript === 'string') {
        // Some models return the JSON in the transcript; attempt parse
        return JSON.parse(content.transcript);
      }
    } catch {}
    // Fallback: return the response object if present, else raw payload
    return payload?.response ?? payload;
  }, [loggedEvents]);

  // Render a crude diff summary when the JSON payload contains ops
  const diffLines = React.useMemo(() => {
    // Accept both flat ops and nested { add_node: {...} } forms
    const ops = (latestJson?.output?.content?.[0]?.json?.ops) || latestJson?.ops || [];
    if (!Array.isArray(ops)) return [] as string[];
    return ops.map((raw: any, idx: number) => {
      const op = normalizeOp(raw);
      if (!op) return `#${idx}: (invalid op)`;
      switch (op.type) {
        case 'add_node':
          return `+ node: ${op.label}`;
        case 'update_node':
          return `~ node: ${op.label}`;
        case 'add_edge':
          return `+ edge: ${op.sourceLabel} —${op.relation || 'related'}→ ${op.targetLabel}`;
        case 'remove_edge':
          return `- edge: ${op.sourceLabel} —${op.relation || 'related'}→ ${op.targetLabel}`;
        default:
          return `#${idx}: ${op.type || 'unknown'}`;
      }
    });
  }, [latestJson]);

  function normalizeOp(raw: any): any | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    if (raw.type) return raw;
    const nestedKey = Object.keys(raw)[0];
    const val = raw[nestedKey];
    if (nestedKey && val && typeof val === 'object') {
      return { type: nestedKey, ...val };
    }
    return undefined;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-xl w-[90vw] h-[80vh] p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-medium">Mind Map Inspector</div>
          <button onClick={onClose} className="px-2 py-1 border rounded-md">Close</button>
        </div>

        <div className="flex gap-2 mb-2">
          <button className={(activeTab==='context'?'bg-gray-800 text-white':'bg-gray-100')+" px-2 py-1 rounded"} onClick={()=>setActiveTab('context')}>Context</button>
          <button className={(activeTab==='diff'?'bg-gray-800 text-white':'bg-gray-100')+" px-2 py-1 rounded"} onClick={()=>setActiveTab('diff')}>Diff</button>
          <button className={(activeTab==='json'?'bg-gray-800 text-white':'bg-gray-100')+" px-2 py-1 rounded"} onClick={()=>setActiveTab('json')}>JSON</button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md p-2 bg-gray-50">
          {activeTab === 'context' && (
            <pre className="whitespace-pre-wrap text-sm">{pretty(latestContext)}</pre>
          )}
          {activeTab === 'diff' && (
            <div className="text-sm">
              {diffLines.length === 0 ? (
                <div className="text-gray-500">No diff ops detected yet.</div>
              ) : (
                <ul className="list-disc pl-5">
                  {diffLines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              )}
            </div>
          )}
          {activeTab === 'json' && (
            <pre className="whitespace-pre text-xs">{pretty(latestJson)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}


