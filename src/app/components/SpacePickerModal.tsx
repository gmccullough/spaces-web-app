"use client";
import React from "react";
import { listSpaces } from "@/app/lib/spaces/client";

type Item = { name: string; lastUpdatedAt?: string | null };

type Props = {
  isOpen: boolean;
  isBlocking: boolean;
  onSelectJustTalk: () => void;
  onSelectSpace: (name: string) => void;
};

export default function SpacePickerModal({ isOpen, isBlocking, onSelectJustTalk, onSelectSpace }: Props) {
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isOpen) return;
      setLoading(true);
      setError(null);
      try {
        const res = await listSpaces();
        if (!cancelled) {
          if ((res as any)?.error) {
            setError((res as any).error?.message || "Failed to load spaces");
          } else {
            const json = res as any;
            const items: Item[] = Array.isArray(json.items)
              ? json.items
              : (Array.isArray(json.spaces) ? (json.spaces as string[]).map((n) => ({ name: n })) : []);
            // Already sorted by API newest→oldest, but enforce if timestamps exist
            items.sort((a, b) => {
              const at = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
              const bt = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
              return bt - at;
            });
            setItems(items);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load spaces");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || isBlocking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const ev = new CustomEvent('spaces:closePicker');
        window.dispatchEvent(ev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isBlocking]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="space-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => {
        if (isBlocking) return; // cannot dismiss
        // dismiss when clicking backdrop only
        if (e.target === e.currentTarget) {
          // parent controls close
          const ev = new CustomEvent('spaces:closePicker');
          window.dispatchEvent(ev);
        }
      }}
    >
      <div className={`absolute inset-0 ${isBlocking ? 'bg-gray-100' : 'bg-black/30'}`} />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 z-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="space-picker-title" className="text-xl font-semibold mb-4 text-gray-900">Pick a Space</h2>

        <div className="mb-4">
          <button
            data-testid="just-talk"
            className="w-full py-3 text-base font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onSelectJustTalk}
          >
            Just talk
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4 text-gray-600">
            <div className="h-5 w-5 mr-2 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
            Loading spaces…
          </div>
        )}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && items.length > 0 && (
          <div role="list" aria-label="Spaces" className="max-h-72 overflow-auto">
            {items.map((it) => (
              <button
                key={it.name}
                role="listitem"
                className="w-full px-3 py-2 my-2 rounded-md bg-blue-50 text-gray-800 font-medium text-center hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={it.name}
                onClick={() => onSelectSpace(it.name)}
                data-testid={`space-${it.name}`}
              >
                <span className="truncate inline-block max-w-full">{truncateName(it.name)}</span>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-gray-600">No spaces yet. Use &quot;Just talk&quot; to begin.</div>
        )}

        {!isBlocking && (
          <div className="mt-4 text-right">
            <button
              onClick={() => {
                const ev = new CustomEvent('spaces:closePicker');
                window.dispatchEvent(ev);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function truncateName(name: string): string {
  if (!name) return "";
  if (name.length <= 200) return name;
  return name.slice(0, 200) + "…";
}


