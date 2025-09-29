"use client";
import React from "react";

type SpaceSelectionContextValue = {
  selectedSpaceName: string | null;
  hasMadeInitialSelection: boolean;
  isPickerOpen: boolean;
  isFirstLoadBlocking: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectJustTalk: () => void;
  selectSpace: (name: string) => void;
};

const SpaceSelectionContext = React.createContext<SpaceSelectionContextValue | undefined>(undefined);

export function SpaceSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedSpaceName, setSelectedSpaceName] = React.useState<string | null>(null);
  const [hasMadeInitialSelection, setHasMadeInitialSelection] = React.useState<boolean>(false);
  const [isPickerOpen, setIsPickerOpen] = React.useState<boolean>(true);

  // Block dismissal until a choice is made
  const isFirstLoadBlocking = !hasMadeInitialSelection;

  const openPicker = React.useCallback(() => setIsPickerOpen(true), []);
  const closePicker = React.useCallback(() => {
    if (!isFirstLoadBlocking) setIsPickerOpen(false);
  }, [isFirstLoadBlocking]);

  const selectJustTalk = React.useCallback(() => {
    setSelectedSpaceName(null);
    setHasMadeInitialSelection(true);
    setIsPickerOpen(false);
  }, []);

  const selectSpace = React.useCallback((name: string) => {
    const trimmed = (name || "").slice(0, 200);
    setSelectedSpaceName(trimmed);
    setHasMadeInitialSelection(true);
    setIsPickerOpen(false);
  }, []);

  // Auto-select a newly created space if emitted by client utils
  React.useEffect(() => {
    const onCreated = (ev: Event) => {
      try {
        const ce = ev as CustomEvent<{ name: string }>;
        const nm = (ce?.detail?.name || "").slice(0, 200);
        if (!nm) return;
        if (!hasMadeInitialSelection || isPickerOpen) {
          selectSpace(nm);
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('spaces:spaceCreated', onCreated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('spaces:spaceCreated', onCreated as EventListener);
      }
    };
  }, [hasMadeInitialSelection, isPickerOpen, selectSpace]);

  const value: SpaceSelectionContextValue = React.useMemo(
    () => ({
      selectedSpaceName,
      hasMadeInitialSelection,
      isPickerOpen,
      isFirstLoadBlocking,
      openPicker,
      closePicker,
      selectJustTalk,
      selectSpace,
    }),
    [selectedSpaceName, hasMadeInitialSelection, isPickerOpen, isFirstLoadBlocking, openPicker, closePicker, selectJustTalk, selectSpace]
  );

  return (
    <SpaceSelectionContext.Provider value={value}>{children}</SpaceSelectionContext.Provider>
  );
}

export function useSpaceSelection() {
  const ctx = React.useContext(SpaceSelectionContext);
  if (!ctx) throw new Error("useSpaceSelection must be used within SpaceSelectionProvider");
  return ctx;
}


