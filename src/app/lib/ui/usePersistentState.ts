"use client";

import React from "react";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readValue<T>(key: string, initialValue: T): T {
  if (!isBrowser()) return initialValue;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return initialValue;
    return JSON.parse(stored);
  } catch (error) {
    console.warn(`usePersistentState: failed to read key "${key}" from localStorage`, error);
    return initialValue;
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = React.useState<T>(() => readValue(key, initialValue));

  const setValue = React.useCallback(
    (value: React.SetStateAction<T>) => {
      setState((prev) => {
        const resolved = typeof value === "function" ? (value as (curr: T) => T)(prev) : value;
        if (isBrowser()) {
          try {
            window.localStorage.setItem(key, JSON.stringify(resolved));
          } catch (error) {
            console.warn(`usePersistentState: failed to write key "${key}"`, error);
          }
        }
        return resolved;
      });
    },
    [key]
  );

  React.useEffect(() => {
    if (!isBrowser()) return;
    setState(readValue(key, initialValue));
  }, [key, initialValue]);

  React.useEffect(() => {
    if (!isBrowser()) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== key) return;
      try {
        setState(event.newValue ? JSON.parse(event.newValue) : initialValue);
      } catch (error) {
        console.warn(`usePersistentState: failed to parse storage event for key "${key}"`, error);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, initialValue]);

  return [state, setValue] as const;
}
