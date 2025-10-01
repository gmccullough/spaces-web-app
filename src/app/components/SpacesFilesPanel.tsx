"use client";

import React from "react";
import SpacesFileTree from "./SpacesFileTree";
import SpacesFileViewer from "./SpacesFileViewer";
import MindMapViewer from "./MindMapViewer";
import { createBrowserSupabase } from "@/app/lib/supabase/client";
import { FileSavedEvent } from "@/app/contexts/EventContext";
import { useSpaceSelection } from "../contexts/SpaceSelectionContext";

type SpacesFilesPanelProps = {
  children?: React.ReactNode;
};

export default function SpacesFilesPanel({ children }: SpacesFilesPanelProps) {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const { selectedSpaceName, openPicker } = useSpaceSelection();
  const spaceName = selectedSpaceName || undefined;
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [toasts, setToasts] = React.useState<Array<{ id: number; text: string; action?: { label: string; onClick: () => void } }>>([]);
  const [viewMode, setViewMode] = React.useState<"files" | "mindmap">("files");

  React.useEffect(() => {
    let cancelled = false;
    async function ensureAuth() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) return;
    }
    ensureAuth();
    return () => { cancelled = true; };
  }, [supabase]);

  // Ensure we don't show the virtual mindmap preview when switching to files mode
  React.useEffect(() => {
    if (viewMode === 'files' && selectedPath === "__mindmap__") {
      setSelectedPath(null);
    }
  }, [viewMode, selectedPath]);

  // Bring newly saved file into preview if not focused (space-scoped)
  React.useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<FileSavedEvent>;
      const e = ce?.detail;
      if (!e || e.spaceName !== spaceName) return;
      if (selectedPath !== e.path) {
        setSelectedPath(e.path);
      }
      // Toast: Saved <filename> with View action
      const name = e.path.substring(e.path.lastIndexOf('/') + 1);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [
        ...prev,
        {
          id,
          text: `Saved ${name}`,
          action: {
            label: 'View',
            onClick: () => { setSelectedPath(e.path); setToasts((p) => p.filter((t) => t.id !== id)); },
          },
        },
      ]);
      // Auto-dismiss after 3s
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
    };
    window.addEventListener('spaces:fileSaved', handler as EventListener);
    return () => window.removeEventListener('spaces:fileSaved', handler as EventListener);
  }, [spaceName, selectedPath]);
  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-3 border-b bg-white sticky top-0 z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <button className="text-gray-900 font-semibold hover:underline" onClick={openPicker}>Spaces</button>
          <span className="text-gray-400">&gt;</span>
          <span className="truncate" title={spaceName || 'Just talk'}>{spaceName || 'Just talk'}</span>
        </div>
        <div className="flex items-center mt-2 md:mt-0">
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
            <button
              className={(viewMode === 'mindmap' ? "bg-gray-800 text-white" : "bg-white text-gray-700") + " px-3 py-1 flex items-center"}
              onClick={() => setViewMode('mindmap')}
            >
              Mind map
            </button>
            <button
              className={(viewMode === 'files' ? "bg-gray-800 text-white" : "bg-white text-gray-700") + " px-3 py-1 flex items-center"}
              onClick={() => setViewMode('files')}
            >
              Files
            </button>
          </div>
        </div>
      </div>
      {viewMode === 'files' && (
        <div className="flex flex-col md:flex-row min-h-[600px] md:max-h-[70vh] md:h-[70vh]">
          <div className="w-full md:w-1/3 md:border-r border-b md:border-b-0 overflow-auto">
            <SpacesFileTree spaceName={spaceName} onSelectPath={setSelectedPath} includeMindMapEntry={false} />
          </div>
          <div className={`w-full md:w-2/3 overflow-auto ${selectedPath ? 'bg-blue-50' : ''}`}>
            <SpacesFileViewer spaceName={spaceName} path={selectedPath} />
          </div>
        </div>
      )}
      {viewMode === 'mindmap' && (
        <div className="min-h-[600px] md:max-h-[70vh] md:h-[70vh] overflow-hidden">
          <MindMapViewer spaceName={spaceName} fullBleed />
        </div>
      )}
      {children}
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {toasts.map((t) => (
            <div key={t.id} className="shadow-lg rounded-md bg-gray-900 text-white px-3 py-2 flex items-center gap-3">
              <span className="text-sm">{t.text}</span>
              {t.action && (
                <button
                  className="text-xs font-semibold text-blue-300 hover:text-blue-200 underline"
                  onClick={t.action.onClick}
                >
                  {t.action.label}
                </button>
              )}
              <button
                className="text-xs text-gray-400 hover:text-gray-200"
                onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


