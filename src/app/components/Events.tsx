"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";

export interface EventsProps {
  isExpanded: boolean;
}

function Events({ isExpanded }: EventsProps) {
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

  return (
    <div
      className={
        (isExpanded ? "w-full md:w-1/2 overflow-auto max-h-[400px]" : "w-0 md:w-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex-col bg-white"
      }
      ref={eventLogsContainerRef}
    >
      {isExpanded && (
        <div>
          <div className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
            <span className="font-semibold">Logs</span>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={suppressDelta} onChange={(e)=>setSuppressDelta(e.target.checked)} />
                <span>Suppress .delta</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={autoScroll} onChange={(e)=>setAutoScroll(e.target.checked)} />
                <span>Auto-scroll</span>
              </label>
            </div>
          </div>
          <div>
            {visibleLogs.map((log, idx) => {
              const arrowInfo = getDirectionArrow(log.direction);
              const isError =
                log.eventName.toLowerCase().includes("error") ||
                log.eventData?.response?.status_details?.error != null;

              return (
                <div
                  key={`${log.id}-${idx}`}
                  className="border-t border-gray-200 py-2 px-6 font-mono"
                >
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <span
                        style={{ color: arrowInfo.color }}
                        className="ml-1 mr-2"
                      >
                      {arrowInfo.symbol}
                      </span>
                      <span
                        className={
                          "flex-1 text-sm " +
                          (isError ? "text-red-600" : "text-gray-800")
                        }
                      >
                        {log.eventName}
                      </span>
                    </div>
                    <div className="text-gray-500 ml-1 text-xs whitespace-nowrap">
                      {log.timestamp}
                    </div>
                  </div>

                  {log.expanded && log.eventData && (
                    <div className="text-gray-800 text-left">
                      <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                        {JSON.stringify(log.eventData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Events;
