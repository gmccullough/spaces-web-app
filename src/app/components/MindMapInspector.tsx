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
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  type FeedItem = {
    responseId: string;
    timestamp: string;
    response: any; // raw response payload
    diff?: any; // parsed JSON with ops
    request?: any; // nearest prior client request event
  };

  // Build chronological feed of OOB responses for channel spaces-mindmap
  const feed: FeedItem[] = React.useMemo(() => {
    const out: FeedItem[] = [];
    for (let i = 0; i < loggedEvents.length; i++) {
      const e = loggedEvents[i];
      if (e.direction !== 'server' || e.eventName !== 'response.done') continue;
      const channel = e.eventData?.response?.metadata?.channel;
      if (channel !== 'spaces-mindmap') continue;
      const response = e.eventData?.response;
      const content = response?.output?.[0]?.content?.[0];
      let diff: any | undefined = undefined;
      try {
        if (content?.type === 'text' && typeof content?.text === 'string') {
          diff = JSON.parse(content.text);
        }
        if (!diff && content?.type === 'audio' && typeof content?.transcript === 'string') {
          diff = JSON.parse(content.transcript);
        }
      } catch {}
      // Find nearest prior analyze request
      let request: any | undefined = undefined;
      for (let j = i - 1; j >= 0; j--) {
        const c = loggedEvents[j];
        if (c.direction === 'client' && c.eventName.startsWith('response.create')) {
          const ch2 = c.eventData?.response?.metadata?.channel || c.eventData?.metadata?.channel;
          if (ch2 === 'spaces-mindmap') { request = c.eventData; break; }
        }
      }
      out.push({ responseId: response?.id, timestamp: e.timestamp, response, diff, request });
    }
    // keep only last 100
    return out.slice(-100);
  }, [loggedEvents]);

  // Maintain selection: default to newest if none, or clamp when feed changes
  React.useEffect(() => {
    if (feed.length === 0) { setSelectedIndex(null); return; }
    if (selectedIndex === null || selectedIndex >= feed.length) {
      setSelectedIndex(feed.length - 1);
    }
  }, [feed.length]);

  const selected = (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < feed.length)
    ? feed[selectedIndex]
    : undefined;

  const diffLines = React.useMemo(() => {
    const ops = selected?.diff?.ops || [];
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
  }, [selected]);

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

        <div className="flex gap-3 flex-1 min-h-0">
          {/* Feed list */}
          <div className="w-64 border rounded-md overflow-hidden flex flex-col">
            <div className="px-2 py-1 border-b text-sm flex items-center justify-between">
              <div>OOB Responses ({feed.length})</div>
              <button className="text-xs underline" onClick={() => setSelectedIndex(feed.length ? feed.length - 1 : null)}>Newest</button>
            </div>
            <div className="flex-1 overflow-auto">
              {feed.length === 0 ? (
                <div className="text-gray-500 p-2 text-sm">No responses yet.</div>
              ) : (
                <ul>
                  {feed.map((item, idx) => {
                    const opsCount = Array.isArray(item?.diff?.ops) ? item.diff.ops.length : 0;
                    const shortId = (item.responseId || '').slice(-6);
                    const isSel = selectedIndex === idx;
                    return (
                      <li key={item.responseId || idx}>
                        <button
                          className={(isSel? 'bg-gray-200':'hover:bg-gray-50')+" w-full text-left px-2 py-1 text-xs border-b"}
                          onClick={() => setSelectedIndex(idx)}
                        >
                          <div className="flex justify-between"><span>{item.timestamp}</span><span>#{shortId}</span></div>
                          <div className="text-gray-600">ops: {opsCount}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex gap-2 mb-2">
              <button className={(activeTab==='context'?'bg-gray-800 text-white':'bg-gray-100')+" px-2 py-1 rounded"} onClick={()=>setActiveTab('context')}>Context</button>
              <button className={(activeTab==='diff'?'bg-gray-800 text-white':'bg-gray-100')+" px-2 py-1 rounded"} onClick={()=>setActiveTab('diff')}>Diff</button>
              <button className={(activeTab==='json'?'bg-gray-800 text-white':'bg-gray-100')+" px-2 py-1 rounded"} onClick={()=>setActiveTab('json')}>JSON</button>
            </div>

            <div className="flex-1 overflow-auto border rounded-md p-2 bg-gray-50">
              {activeTab === 'context' && (
                <pre className="whitespace-pre-wrap text-sm">{pretty(selected?.request ?? {})}</pre>
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
                <pre className="whitespace-pre text-xs">{pretty(selected?.diff ?? selected?.response ?? {})}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


