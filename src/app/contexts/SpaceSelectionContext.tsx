"use client";
import React from "react";

type SpaceSelectionContextValue = {
  selectedSpaceName: string | null;
  hasMadeInitialSelection: boolean;
  isPickerOpen: boolean;
  isFirstLoadBlocking: boolean;
  openPicker: () => void;
  closePicker: () => void;
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

  React.useEffect(() => {
    const onRenamed = (ev: Event) => {
      try {
        const ce = ev as CustomEvent<{ oldName?: string; newName?: string }>;
        const next = (ce?.detail?.newName || '').slice(0, 200);
        const prev = (ce?.detail?.oldName || '').slice(0, 200);
        if (!next) return;
        if (selectedSpaceName && prev && selectedSpaceName === prev) {
          setSelectedSpaceName(next);
          setHasMadeInitialSelection(true);
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('spaces:spaceRenamed', onRenamed as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('spaces:spaceRenamed', onRenamed as EventListener);
      }
    };
  }, [selectedSpaceName]);

  const value: SpaceSelectionContextValue = React.useMemo(
    () => ({
      selectedSpaceName,
      hasMadeInitialSelection,
      isPickerOpen,
      isFirstLoadBlocking,
      openPicker,
      closePicker,
      selectSpace,
    }),
    [selectedSpaceName, hasMadeInitialSelection, isPickerOpen, isFirstLoadBlocking, openPicker, closePicker, selectSpace]
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
