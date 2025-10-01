"use client";

import React from "react";

import { useEventListener } from "@/app/lib/ui/useEventListener";
import { FileSavedEvent } from "@/app/contexts/EventContext";

type UseSpaceFileSavedOptions = {
  debounceMs?: number;
};

type SpaceFileSavedHandler = (event: FileSavedEvent) => void;

export function useSpaceFileSaved(
  spaceName: string | undefined,
  onFileSaved: SpaceFileSavedHandler,
  options?: UseSpaceFileSavedOptions
) {
  const { debounceMs = 0 } = options ?? {};
  const handlerRef = React.useRef<SpaceFileSavedHandler>(onFileSaved);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    handlerRef.current = onFileSaved;
  }, [onFileSaved]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useEventListener(
    "spaces:fileSaved",
    (event) => {
      const detail = (event as CustomEvent<FileSavedEvent>).detail;
      if (!detail) return;
      if (!spaceName || detail.spaceName !== spaceName) return;

      const invoke = () => handlerRef.current(detail);
      if (debounceMs > 0) {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(invoke, debounceMs);
      } else {
        invoke();
      }
    },
    typeof window !== "undefined" ? window : null
  );
}
