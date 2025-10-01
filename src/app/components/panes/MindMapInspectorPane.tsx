"use client";

import React from "react";

import Pane from "@/app/components/ui/Pane";
import ToggleGroup from "@/app/components/ui/ToggleGroup";
import IconButton from "@/app/components/ui/IconButton";
import { Cross2Icon, RocketIcon } from "@radix-ui/react-icons";
import EmptyState from "@/app/components/ui/EmptyState";
import { cn } from "@/app/lib/ui/cn";
import { useEvent } from "@/app/contexts/EventContext";
import { normalizeMindMapOp } from "@/app/lib/spaces/mindmapUtils";

const TAB_OPTIONS = [
  { value: "context", label: "Context" },
  { value: "diff", label: "Diff" },
  { value: "json", label: "JSON" },
] as const;

type MindMapInspectorProps = {
  isOpen: boolean;
  onClose: () => void;
  onAnalyzeNow?: () => void;
};

type FeedItem = {
  responseId: string;
  timestamp: string;
  response: any;
  diff?: any;
  request?: any;
};

export default function MindMapInspectorPane({ isOpen, onClose, onAnalyzeNow }: MindMapInspectorProps) {
  const { loggedEvents } = useEvent();
  const [activeTab, setActiveTab] = React.useState<(typeof TAB_OPTIONS)[number]["value"]>("context");
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const feed = React.useMemo<FeedItem[]>(() => buildFeed(loggedEvents), [loggedEvents]);

  React.useEffect(() => {
    if (feed.length === 0) {
      setSelectedIndex(null);
      return;
    }
    setSelectedIndex((index) => {
      if (index === null || index >= feed.length) return feed.length - 1;
      return index;
    });
  }, [feed.length]);

  const selected = selectedIndex !== null ? feed[selectedIndex] : undefined;
  const diffLines = React.useMemo<string[]>(() => describeDiff(selected?.diff), [selected]);

  if (!isOpen) return null;

  return (
    <Pane className="h-full">
      <Pane.Header
        title="Concept Inspector"
        actions={
          <div className="flex items-center gap-1">
            {onAnalyzeNow ? (
              <IconButton
                icon={<RocketIcon className="h-3.5 w-3.5" />}
                ariaLabel="Analyze now"
                variant="ghost"
                size="sm"
                onClick={onAnalyzeNow}
              />
            ) : null}
            <IconButton
              icon={<Cross2Icon className="h-3.5 w-3.5" />}
              ariaLabel="Close inspector"
              variant="ghost"
              size="sm"
              onClick={onClose}
            />
          </div>
        }
      />
      <Pane.Body className="p-0">
        <div className="flex h-[30vh] flex-col gap-3 px-4 pb-4 pt-3 md:h-[38vh] md:flex-row">
          <aside className="md:w-64">
            <div className="rounded-lg border border-gray-200">
              <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                <span>OOB Responses ({feed.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(feed.length ? feed.length - 1 : null)}
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Newest
                </button>
              </header>
              <div className="max-h-60 overflow-auto">
                {feed.length === 0 ? (
                  <EmptyState dense title="No responses" description="Run an analysis to view changes." />
                ) : (
                  <ul className="divide-y divide-gray-200 text-xs">
                    {feed.map((item, index) => {
                      const opsCount = Array.isArray(item?.diff?.ops) ? item.diff.ops.length : 0;
                      const shortId = (item.responseId || "").slice(-6);
                      const isSelected = selectedIndex === index;
                      return (
                        <li key={item.responseId || index}>
                          <button
                            type="button"
                            onClick={() => setSelectedIndex(index)}
                            className={cn(
                              "flex w-full flex-col gap-1 px-3 py-2 text-left transition",
                              isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-center justify-between font-mono">
                              <span>{item.timestamp}</span>
                              <span>#{shortId}</span>
                            </div>
                            <div className="text-gray-600">ops: {opsCount}</div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="pb-2">
              <ToggleGroup
                value={activeTab}
                onChange={(value) => setActiveTab(value as typeof activeTab)}
                options={TAB_OPTIONS.map((option) => ({ ...option }))}
                ariaLabel="Inspector view"
                size="sm"
              />
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              {activeTab === "context" && (
                <pre className="whitespace-pre-wrap break-words text-xs text-gray-800">
                  {stringify(selected?.request)}
                </pre>
              )}

              {activeTab === "diff" && (
                <div className="space-y-2 text-sm text-gray-800">
                  {diffLines.length === 0 ? (
                    <EmptyState dense title="No diff ops" description="Awaiting graph updates." />
                  ) : (
                    <ul className="list-disc space-y-1 pl-5">
                      {diffLines.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "json" && (
                <pre className="whitespace-pre-wrap break-words text-xs text-gray-800">
                  {stringify(selected?.diff ?? selected?.response)}
                </pre>
              )}
            </div>
          </section>
        </div>
      </Pane.Body>
    </Pane>
  );
}

function buildFeed(loggedEvents: any[]): FeedItem[] {
  const results: FeedItem[] = [];
  for (let i = 0; i < loggedEvents.length; i += 1) {
    const event = loggedEvents[i];
    if (event.direction !== "server" || event.eventName !== "response.done") continue;
    const channel = event.eventData?.response?.metadata?.channel;
    if (channel !== "spaces-mindmap") continue;

    const response = event.eventData?.response;
    const content = response?.output?.[0]?.content?.[0];
    let diff: any | undefined;
    try {
      if (content?.type === "text" && typeof content.text === "string") {
        diff = JSON.parse(content.text);
      }
      if (!diff && content?.type === "audio" && typeof content.transcript === "string") {
        diff = JSON.parse(content.transcript);
      }
    } catch {}

    let request: any | undefined;
    for (let j = i - 1; j >= 0; j -= 1) {
      const candidate = loggedEvents[j];
      if (candidate.direction !== "client") continue;
      if (!candidate.eventName.startsWith("response.create")) continue;
      const channelCandidate =
        candidate.eventData?.response?.metadata?.channel || candidate.eventData?.metadata?.channel;
      if (channelCandidate === "spaces-mindmap") {
        request = candidate.eventData;
        break;
      }
    }

    results.push({
      responseId: response?.id,
      timestamp: event.timestamp,
      response,
      diff,
      request,
    });
  }
  return results.slice(-100);
}

function describeDiff(diff: { ops?: unknown[] } | undefined): string[] {
  if (!diff) return [];
  const ops = Array.isArray(diff.ops) ? diff.ops : [];
  const lines: string[] = [];

  ops.forEach((raw, index) => {
    const op = normalizeMindMapOp(raw);
    if (!op) {
      lines.push(`#${index}: (invalid op)`);
      return;
    }

    switch (op.type) {
      case "add_node":
        lines.push(`+ node: ${op.label}`);
        break;
      case "update_node":
        lines.push(`~ node: ${op.label}`);
        break;
      case "add_edge":
        lines.push(`+ edge: ${op.sourceLabel} —${op.relation || "related"}→ ${op.targetLabel}`);
        break;
      case "remove_edge":
        lines.push(`- edge: ${op.sourceLabel} —${op.relation || "related"}→ ${op.targetLabel}`);
        break;
      default:
        lines.push(`#${index}: ${op.type || "unknown"}`);
    }
  });

  return lines;
}

function stringify(value: any) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "");
  }
}
