"use client";

import React from "react";

import { usePersistentState } from "@/app/lib/ui/usePersistentState";

type UILayoutContextValue = {
  isEventsOpen: boolean;
  setEventsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleEvents: () => void;
  isInspectorOpen: boolean;
  setInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleInspector: () => void;
};

const UILayoutContext = React.createContext<UILayoutContextValue | undefined>(undefined);

export function UILayoutProvider({ children }: { children: React.ReactNode }) {
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
      isEventsOpen,
      setEventsOpen: setEventsOpenState,
      toggleEvents: () => setEventsOpenState((prev) => !prev),
      isInspectorOpen,
      setInspectorOpen: setInspectorOpenState,
      toggleInspector: () => setInspectorOpenState((prev) => !prev),
    }),
    [isEventsOpen, isInspectorOpen, setEventsOpenState, setInspectorOpenState]
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
