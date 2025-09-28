"use client";

import React from "react";
import { readSpaceFile } from "@/app/lib/spaces/client";

export type FileContentState = {
  loading: boolean;
  error?: string;
  contentText?: string;
  contentType?: string;
  isBinary?: boolean;
  truncated?: boolean;
};

const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2MB

function isTextual(contentType: string): boolean {
  const ct = (contentType || "").toLowerCase();
  if (ct.startsWith("text/")) return true;
  return [
    "application/json",
    "application/markdown",
    "application/xml",
    "application/yaml",
  ].some((t) => ct.startsWith(t));
}

export function useSpacesFileContent(spaceName: string | undefined, path: string | null) {
  const [state, setState] = React.useState<FileContentState>({ loading: false });

  React.useEffect(() => {
    let aborted = false;
    async function run() {
      if (!spaceName || !path) {
        setState({ loading: false });
        return;
      }
      setState({ loading: true });
      const res = await readSpaceFile(spaceName, path);
      if (aborted) return;
      if ((res as any).error) {
        setState({ loading: false, error: (res as any).error.message || "Error" });
        return;
      }
      const { contentBase64, contentType, size } = res as any;
      if (!isTextual(contentType)) {
        setState({ loading: false, isBinary: true, contentType });
        return;
      }
      const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0));
      const truncated = bytes.byteLength > MAX_TEXT_BYTES;
      const used = truncated ? bytes.subarray(0, MAX_TEXT_BYTES) : bytes;
      const text = new TextDecoder("utf-8").decode(used);
      setState({ loading: false, contentText: text, contentType, truncated });
    }
    run();
    return () => { aborted = true; };
  }, [spaceName, path]);

  return state;
}


