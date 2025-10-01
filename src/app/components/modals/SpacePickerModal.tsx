"use client";

import React from "react";
import Modal from "@/app/components/ui/Modal";
import Loader from "@/app/components/ui/Loader";
import ErrorMessage from "@/app/components/ui/ErrorMessage";
import EmptyState from "@/app/components/ui/EmptyState";
import { listSpaces } from "@/app/lib/spaces/client";
import { cn } from "@/app/lib/ui/cn";

type SpaceSummary = {
  name: string;
  lastUpdatedAt?: string | null;
};

type SpacePickerModalProps = {
  isOpen: boolean;
  isBlocking?: boolean;
  onSelectJustTalk: () => void;
  onSelectSpace: (name: string) => void;
  onClose: () => void;
};

export default function SpacePickerModal({
  isOpen,
  isBlocking = false,
  onSelectJustTalk,
  onSelectSpace,
  onClose,
}: SpacePickerModalProps) {
  const [items, setItems] = React.useState<SpaceSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listSpaces();
      const payload = response as any;
      const resolved: SpaceSummary[] = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.spaces)
        ? (payload.spaces as string[]).map((name) => ({ name }))
        : [];
      resolved.sort((a, b) => {
        const at = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
        const bt = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
        return bt - at;
      });
      setItems(resolved);
    } catch (err: any) {
      const message = err?.message || "Failed to load spaces";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    loadItems();
  }, [isOpen, loadItems]);

  const handleSelectSpace = React.useCallback(
    (name: string) => {
      if (!name) return;
      onSelectSpace(name);
      if (!isBlocking) {
        onClose();
      }
    },
    [isBlocking, onClose, onSelectSpace]
  );

  const handleSelectJustTalk = React.useCallback(() => {
    onSelectJustTalk();
    if (!isBlocking) {
      onClose();
    }
  }, [isBlocking, onClose, onSelectJustTalk]);

  React.useEffect(() => {
    if (!isOpen || !listRef.current) return;
    listRef.current.scrollTop = 0;
  }, [isOpen, items.length]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose a Space"
      size="md"
      isDismissible={!isBlocking}
      className={cn(isBlocking && "border border-gray-200")}
    >
      <Modal.Body>
        <button
            data-testid="just-talk"
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={handleSelectJustTalk}
          >
            New Space
          </button>

        {loading ? (
            <Loader label="Loading spaces…" className="justify-center" />
          ) : error ? (
            <ErrorMessage title="Unable to load spaces" description={error} />
          ) : items.length > 0 ? (
            <div
              ref={listRef}
              role="list"
              aria-label="Available spaces"
              className="max-h-72 overflow-auto rounded-lg border border-gray-200"
            >
              <div className="flex flex-col divide-y divide-gray-200">
                {items.map((item) => (
                  <button
                    key={item.name}
                    role="listitem"
                    data-testid={`space-${item.name}`}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-800 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    onClick={() => handleSelectSpace(item.name)}
                  >
                    <span className="truncate">{truncateName(item.name)}</span>
                    {item.lastUpdatedAt ? (
                      <span className="ml-4 text-xs text-gray-500">
                        {formatRelativeTime(item.lastUpdatedAt)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
        ) : (
          <EmptyState
            dense
            title="No spaces yet"
            description="Create a new space to get started."
          />
        )}
      </Modal.Body>
      {!isBlocking ? (
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Close
          </button>
        </Modal.Footer>
      ) : null}
    </Modal>
  );
}

function truncateName(name: string): string {
  if (!name) return "";
  return name.length <= 200 ? name : `${name.slice(0, 200)}…`;
}

function formatRelativeTime(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return "";
  const deltaMs = Date.now() - timestamp;
  const deltaMinutes = Math.floor(deltaMs / (60 * 1000));
  if (deltaMinutes < 1) return "just now";
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) return `${deltaDays}d ago`;
  const deltaWeeks = Math.floor(deltaDays / 7);
  if (deltaWeeks < 4) return `${deltaWeeks}w ago`;
  const deltaMonths = Math.floor(deltaDays / 30);
  if (deltaMonths < 12) return `${deltaMonths}mo ago`;
  const deltaYears = Math.floor(deltaDays / 365);
  return `${deltaYears}y ago`;
}
