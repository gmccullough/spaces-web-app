"use client";

import React from "react";
import SpacesFileTree from "./SpacesFileTree";
import SpacesFileViewer from "./SpacesFileViewer";
import { createBrowserSupabase } from "@/app/lib/supabase/client";

type SpacesFilesPanelProps = {
  children?: React.ReactNode;
};

export default function SpacesFilesPanel({ children }: SpacesFilesPanelProps) {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const [spaceName, setSpaceName] = React.useState<string | undefined>(undefined);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [spaces, setSpaces] = React.useState<string[]>([]);
  const [loadingSpaces, setLoadingSpaces] = React.useState<boolean>(false);

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
          <SpacesFileTree spaceName={spaceName} onSelectPath={setSelectedPath} onSelectSpace={setSpaceName} />
        </div>
        <div className="w-full md:w-2/3 overflow-auto">
          <SpacesFileViewer spaceName={spaceName} path={selectedPath} />
        </div>
      </div>
      {children}
    </div>
  );
}


