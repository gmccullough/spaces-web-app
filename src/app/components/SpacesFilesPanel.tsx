"use client";

import React from "react";
import SpacesFileTree from "./SpacesFileTree";
import SpacesFileViewer from "./SpacesFileViewer";
import { createBrowserSupabase } from "@/app/lib/supabase/client";
import { FileSavedEvent } from "@/app/contexts/EventContext";

type SpacesFilesPanelProps = {
  children?: React.ReactNode;
};

export default function SpacesFilesPanel({ children }: SpacesFilesPanelProps) {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const [spaceName, setSpaceName] = React.useState<string | undefined>(undefined);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [spaces, setSpaces] = React.useState<string[]>([]);
  const [loadingSpaces, setLoadingSpaces] = React.useState<boolean>(false);
  const [toasts, setToasts] = React.useState<Array<{ id: number; text: string; action?: { label: string; onClick: () => void } }>>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setSpaceName(undefined);
        return;
      }
      try {
        setLoadingSpaces(true);
        const res = await fetch('/api/spaces');
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json.spaces) ? json.spaces : [];
          setSpaces(list);
          // Prefer 'ideas' if present; otherwise first space.
          const preferred = list.includes('ideas') ? 'ideas' : (list[0] || undefined);
          setSpaceName((prev) => prev || preferred);
        }
      } finally {
        setLoadingSpaces(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [supabase]);

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
      <div className="px-6 py-3 border-b bg-white sticky top-0 z-10 flex items-center justify-start">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Spaces</span>
          <select
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
            value={spaceName || ''}
            onChange={(e) => { setSelectedPath(null); setSpaceName(e.target.value || undefined); }}
            disabled={loadingSpaces || !spaces.length}
          >
            {!spaces.length && <option value="">No spaces</option>}
            {spaces.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col md:flex-row min-h-[240px] md:max-h-[40vh] md:h-[40vh]">
        <div className="w-full md:w-1/3 md:border-r border-b md:border-b-0 overflow-auto">
          <SpacesFileTree spaceName={spaceName} onSelectPath={setSelectedPath} />
        </div>
        <div className={`w-full md:w-2/3 overflow-auto ${selectedPath ? 'bg-blue-50' : ''}`}>
          <SpacesFileViewer spaceName={spaceName} path={selectedPath} />
        </div>
      </div>
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


