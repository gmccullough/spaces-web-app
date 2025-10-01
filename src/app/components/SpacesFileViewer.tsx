"use client";

import React from "react";
import { useSpacesFileContent } from "@/app/hooks/useSpacesFileContent";
import MindMapViewer from "@/app/components/MindMapViewer";

type Props = {
  spaceName?: string;
  path: string | null;
};

export default function SpacesFileViewer({ spaceName, path }: Props) {
  const { loading, error, isBinary, contentText, contentType, truncated } = useSpacesFileContent(spaceName, path);

  if (!spaceName) {
    return <div className="p-3 text-sm text-gray-500">Sign in to view files.</div>;
  }
  if (!path) {
    return <div className="p-3 text-sm text-gray-500">Select a file to preview.</div>;
  }
  if (path === "__mindmap__") {
    return <MindMapViewer spaceName={spaceName} />;
  }
  if (loading) {
    return <div className="p-3 text-sm text-gray-500">Loading…</div>;
  }
  if (error) {
    return <div className="p-3 text-sm text-red-600">{error}</div>;
  }
  if (isBinary) {
    return (
      <div className="p-3 text-sm text-gray-700">
        Binary file (content type {contentType || "unknown"}) not displayed.
      </div>
    );
  }
  return (
    <div className="p-3">
      {contentText ? (
        <pre className="whitespace-pre-wrap break-words font-mono text-xs">
          {contentText}
          {truncated && "\n\n--- Truncated ---"}
        </pre>
      ) : (
        <div className="text-sm text-gray-500">No content.</div>
      )}
    </div>
  );
}


