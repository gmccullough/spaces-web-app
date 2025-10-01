"use client";

import React, { useRef, useEffect, useState } from "react";
import Pane from "@/app/components/ui/Pane";
import { cn } from "@/app/lib/ui/cn";
import { useEvent } from "@/app/contexts/EventContext";
import { useUILayout } from "@/app/contexts/UILayoutContext";
import { LoggedEvent } from "@/app/types";

function Events() {
  const { isEventsOpen: isExpanded } = useUILayout();
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);
  const [suppressDelta, setSuppressDelta] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = localStorage.getItem('logsSuppressDelta');
    return v ? v === 'true' : true;
  });
  const [autoScroll, setAutoScroll] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const v = localStorage.getItem('logsAutoScroll');
    return v ? v === 'true' : false;
  });

  const { loggedEvents, toggleExpand } = useEvent();

  const getDirectionArrow = (direction: string) => {
    if (direction === "client") return { symbol: "▲", color: "#7f5af0" };
    if (direction === "server") return { symbol: "▼", color: "#2cb67d" };
    return { symbol: "•", color: "#555" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;
    if (isExpanded && autoScroll && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop = eventLogsContainerRef.current.scrollHeight;
    }
    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded, autoScroll]);

  useEffect(() => {
    try { localStorage.setItem('logsSuppressDelta', suppressDelta.toString()); } catch {}
  }, [suppressDelta]);
  useEffect(() => {
    try { localStorage.setItem('logsAutoScroll', autoScroll.toString()); } catch {}
  }, [autoScroll]);

  const visibleLogs = React.useMemo(() => {
    if (!suppressDelta) return loggedEvents;
    return loggedEvents.filter((log) => !/\.delta$/i.test(log.eventName));
  }, [loggedEvents, suppressDelta]);

  if (!isExpanded) {
    return null;
  }

  return (
    <Pane className="flex-1 min-h-0" id="events-pane">
      <Pane.Header
        title="Logs"
        actions={
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <label className="flex items-center gap-1 leading-none">
              <input
                type="checkbox"
                checked={suppressDelta}
                onChange={(event) => setSuppressDelta(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Suppress .delta
            </label>
            <label className="flex items-center gap-1 leading-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(event) => setAutoScroll(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-scroll
            </label>
          </div>
        }
      />
      <Pane.Body className="p-0">
        <div ref={eventLogsContainerRef} className="max-h-[360px] overflow-auto">
          {visibleLogs.map((log, idx) => {
            const arrowInfo = getDirectionArrow(log.direction);
            const isError =
              log.eventName.toLowerCase().includes("error") ||
              log.eventData?.response?.status_details?.error != null;

            return (
              <div
                key={`${log.id}-${idx}`}
                className="border-b border-gray-200 px-4 py-3 font-mono last:border-b-0"
              >
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <div className="flex flex-1 items-center">
                    <span style={{ color: arrowInfo.color }} className="mr-2 text-sm">
                      {arrowInfo.symbol}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-xs",
                        isError ? "text-red-600" : "text-gray-800"
                      )}
                    >
                      {log.eventName}
                    </span>
                  </div>
                  <div className="ml-2 text-[11px] text-gray-500">{log.timestamp}</div>
                </div>

                {log.expanded && log.eventData && (
                  <div className="mt-2 text-left text-xs text-gray-800">
                    <pre className="ml-3 border-l-2 border-gray-200 pl-3">{JSON.stringify(log.eventData, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Pane.Body>
    </Pane>
  );
}

export default Events;
