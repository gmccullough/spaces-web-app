"use client";

import React, { createContext, useContext, useState, FC, PropsWithChildren } from "react";
import { v4 as uuidv4 } from "uuid";
import { LoggedEvent } from "@/app/types";

type EventContextValue = {
  loggedEvents: LoggedEvent[];
  logClientEvent: (eventObj: Record<string, any>, eventNameSuffix?: string) => void;
  logServerEvent: (eventObj: Record<string, any>, eventNameSuffix?: string) => void;
  logHistoryItem: (item: any) => void;
  toggleExpand: (id: number | string) => void;
  emitFileSaved: (e: FileSavedEvent) => void;
  onFileSaved: (handler: (e: FileSavedEvent) => void) => () => void;
  clearLoggedEvents: () => void;
};

const EventContext = createContext<EventContextValue | undefined>(undefined);

export type FileSavedEvent = {
  spaceName: string;
  path: string;
  etag?: string;
  size?: number;
  updatedAt?: string;
};

export const EventProvider: FC<PropsWithChildren> = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([]);

  function addLoggedEvent(direction: "client" | "server", eventName: string, eventData: Record<string, any>) {
    const id = eventData.event_id || uuidv4();
    setLoggedEvents((prev) => [
      ...prev,
      {
        id,
        direction,
        eventName,
        eventData,
        timestamp: new Date().toLocaleTimeString(),
        expanded: false,
      },
    ]);
  }

  const logClientEvent: EventContextValue["logClientEvent"] = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("client", name, eventObj);
  };

  const logServerEvent: EventContextValue["logServerEvent"] = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("server", name, eventObj);
  };

  const logHistoryItem: EventContextValue['logHistoryItem'] = (item) => {
    let eventName = item.type;
    if (item.type === 'message') {
      eventName = `${item.role}.${item.status}`;
    }
    if (item.type === 'function_call') {
      eventName = `function.${item.name}.${item.status}`;
    }
    addLoggedEvent('server', eventName, item);
  };

  const toggleExpand: EventContextValue['toggleExpand'] = (id) => {
    setLoggedEvents((prev) =>
      prev.map((log) => {
        if (log.id === id) {
          return { ...log, expanded: !log.expanded };
        }
        return log;
      })
    );
  };

  const emitFileSaved: EventContextValue['emitFileSaved'] = (e) => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<FileSavedEvent>('spaces:fileSaved', { detail: e }));
      }
      // Also log for dev visibility
      logClientEvent({ type: 'fileSaved', ...e }, 'emit');
    } catch {}
  };

  const onFileSaved: EventContextValue['onFileSaved'] = (handler) => {
    const listener = (ev: Event) => {
      const ce = ev as CustomEvent<FileSavedEvent>;
      if (ce?.detail) handler(ce.detail);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('spaces:fileSaved', listener as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('spaces:fileSaved', listener as EventListener);
      }
    };
  };

  const clearLoggedEvents: EventContextValue['clearLoggedEvents'] = () => {
    setLoggedEvents([]);
  };


  return (
    <EventContext.Provider
      value={{ loggedEvents, logClientEvent, logServerEvent, logHistoryItem, toggleExpand, emitFileSaved, onFileSaved, clearLoggedEvents }}
    >
      {children}
    </EventContext.Provider>
  );
};

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}
