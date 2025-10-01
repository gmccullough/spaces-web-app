"use client";

import React from "react";

import Pane from "@/app/components/ui/Pane";
import ToggleGroup from "@/app/components/ui/ToggleGroup";
import EmptyState from "@/app/components/ui/EmptyState";
import { useToast } from "@/app/components/ui/ToastProvider";
import { createBrowserSupabase } from "@/app/lib/supabase/client";
import { cn } from "@/app/lib/ui/cn";
import { useSpaceSelection } from "@/app/contexts/SpaceSelectionContext";
import { FileSavedEvent } from "@/app/contexts/EventContext";
import { MINDMAP_VIRTUAL_PATH } from "@/app/lib/spaces/constants";
import { useSpaceFileSaved } from "@/app/lib/spaces/useSpaceFileSaved";

import SpacesFileTree from "../SpacesFileTree";
import SpacesFileViewer from "../SpacesFileViewer";
import MindMapViewer from "../MindMapViewer";

const VIEW_OPTIONS = [
  { value: "mindmap", label: "Mind map" },
  { value: "files", label: "Files" },
] as const;

type SpacesFilesPaneProps = {
  children?: React.ReactNode;
};

type ViewMode = (typeof VIEW_OPTIONS)[number]["value"];

export default function SpacesFilesPane({ children }: SpacesFilesPaneProps) {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const { selectedSpaceName, openPicker } = useSpaceSelection();
  const { showToast } = useToast();
  const spaceName = selectedSpaceName || undefined;
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("files");

  React.useEffect(() => {
    let cancelled = false;
    async function ensureAuth() {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) {
        await supabase.auth.refreshSession();
      }
    }
    ensureAuth();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  React.useEffect(() => {
    if (viewMode === "files" && selectedPath === MINDMAP_VIRTUAL_PATH) {
      setSelectedPath(null);
    }
  }, [viewMode, selectedPath]);

  const handleFileSaved = React.useCallback(
    (detail: FileSavedEvent) => {
      setSelectedPath((prev) => (prev === detail.path ? prev : detail.path));

      const filename = detail.path.substring(detail.path.lastIndexOf("/") + 1);
      showToast({
        title: "File saved",
        description: filename,
        action: {
          label: "View",
          onClick: () => setSelectedPath(detail.path),
        },
      });
    },
    [showToast]
  );

  useSpaceFileSaved(spaceName, handleFileSaved);

  const viewOptions = React.useMemo(
    () =>
      VIEW_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    []
  );

  return (
    <Pane className="h-full">
      <Pane.Header
        actions={
          <ToggleGroup
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={viewOptions}
            ariaLabel="Spaces view mode"
            size="sm"
          />
        }
      >
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Select space"
        >
          <span className="truncate">{spaceName ? spaceName : "Just talk"}</span>
          <svg
            className="h-4 w-4 shrink-0 text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </Pane.Header>
      <Pane.Body className="p-0">
        {viewMode === "files" ? (
          <div className="flex min-h-[480px] flex-col md:h-[70vh] md:flex-row">
            <div className="md:w-1/3 md:border-r">
              <SpacesFileTree
                spaceName={spaceName}
                onSelectPath={setSelectedPath}
                includeMindMapEntry={false}
              />
            </div>
            <div className={cn("flex-1 overflow-auto", selectedPath ? "bg-blue-50" : "bg-white")}
            >
              {selectedPath ? (
                <SpacesFileViewer spaceName={spaceName} path={selectedPath} />
              ) : (
                <EmptyState
                  dense
                  title="No file selected"
                  description="Select a file from the tree to preview its contents."
                />
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-[480px] overflow-hidden md:h-[70vh]">
            {spaceName ? (
              <MindMapViewer spaceName={spaceName} fullBleed />
            ) : (
              <EmptyState
                dense
                title="No space selected"
                description="Choose a space to view its mind map."
              />
            )}
          </div>
        )}
      </Pane.Body>
      {children}
    </Pane>
  );
}
