"use client";

import React, { createContext, useContext } from "react";
import { useSpacesMindMap } from "@/app/hooks/useSpacesMindMap";

type MindMapContextValue = ReturnType<typeof useSpacesMindMap>;

const MindMapContext = createContext<MindMapContextValue | undefined>(undefined);

export function MindMapProvider({ children }: { children: React.ReactNode }) {
  const value = useSpacesMindMap();
  return <MindMapContext.Provider value={value}>{children}</MindMapContext.Provider>;
}

export function useMindMap() {
  const ctx = useContext(MindMapContext);
  if (!ctx) throw new Error("useMindMap must be used within a MindMapProvider");
  return ctx;
}


