export function resolveSpacePrefix(userId: string, spaceName: string): string {
  const name = normalizeSegment(spaceName);
  return `users/${userId}/Spaces/${name}/`;
}

export function normalizeRelativePath(input: string): string {
  if (!input) return "";
  if (input.includes("\\") || input.includes("\0")) {
    throw invalidPath("Path contains disallowed characters");
  }
  const parts = input.replace(/^\/+/, "").split("/").filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") throw invalidPath("Path contains traversal segment");
    out.push(normalizeSegment(p));
  }
  return out.join("/");
}

export function normalizeSegment(seg: string): string {
  const s = seg.trim();
  if (s.includes("/") || s.includes("\\") || s.includes("..")) {
    throw invalidPath("Invalid segment");
  }
  return s;
}

export function invalidPath(message: string) {
  const err = new Error(message) as Error & { code?: string };
  err.code = "INVALID_PATH";
  return err;
}


