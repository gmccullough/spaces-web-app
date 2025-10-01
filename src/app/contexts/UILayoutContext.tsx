"use client";

import React from "react";

import { usePersistentState } from "@/app/lib/ui/usePersistentState";

type UILayoutContextValue = {
  isTranscriptOpen: boolean;
  setTranscriptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleTranscript: () => void;
  isEventsOpen: boolean;
  setEventsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleEvents: () => void;
  isInspectorOpen: boolean;
  setInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleInspector: () => void;
};

const UILayoutContext = React.createContext<UILayoutContextValue | undefined>(undefined);

export function UILayoutProvider({ children }: { children: React.ReactNode }) {
  const [isTranscriptOpen, setTranscriptOpenState] = usePersistentState<boolean>(
    "transcriptExpanded",
    true
  );
  const [isEventsOpen, setEventsOpenState] = usePersistentState<boolean>(
    "logsExpanded",
    false
  );
  const [isInspectorOpen, setInspectorOpenState] = usePersistentState<boolean>(
    "inspectorExpanded",
    false
  );

  const value = React.useMemo<UILayoutContextValue>(
    () => ({
      isTranscriptOpen,
      setTranscriptOpen: setTranscriptOpenState,
      toggleTranscript: () => setTranscriptOpenState((prev) => !prev),
      isEventsOpen,
      setEventsOpen: setEventsOpenState,
      toggleEvents: () => setEventsOpenState((prev) => !prev),
      isInspectorOpen,
      setInspectorOpen: setInspectorOpenState,
      toggleInspector: () => setInspectorOpenState((prev) => !prev),
    }),
    [isTranscriptOpen, isEventsOpen, isInspectorOpen, setTranscriptOpenState, setEventsOpenState, setInspectorOpenState]
  );

  return <UILayoutContext.Provider value={value}>{children}</UILayoutContext.Provider>;
}

export function useUILayout() {
  const context = React.useContext(UILayoutContext);
  if (!context) {
    throw new Error("useUILayout must be used within a UILayoutProvider");
  }
  return context;
}
