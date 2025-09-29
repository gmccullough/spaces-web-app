import { createBrowserSupabase } from "@/app/lib/supabase/client";

type FileEntry = {
  path: string;
  name: string;
  size: number;
  contentType?: string;
  updatedAt?: string;
  isDirectory?: boolean;
};

type ListFilesResponse = { files: FileEntry[] };

type WriteFileResponse = {
  path: string;
  size: number;
  contentType: string;
  etag?: string;
};

type ErrorEnvelope = { error: { code: string; message: string } };

type ListSpacesResponse = { spaces: string[]; items?: { name: string; lastUpdatedAt?: string | null }[] };

async function getAccessToken(): Promise<string | undefined> {
  try {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || undefined;
  } catch {
    return undefined;
  }
}

async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = await getAccessToken();
  return token
    ? { ...(extra || {}), Authorization: `Bearer ${token}` }
    : { ...(extra || {}) };
}

export async function listSpaceFiles(
  spaceName: string,
  opts?: { dir?: string; recursive?: boolean }
): Promise<ListFilesResponse | ErrorEnvelope> {
  const params = new URLSearchParams();
  const normalizedDir = normalizeDir(opts?.dir);
  if (normalizedDir) params.set("dir", normalizedDir);
  if (opts?.recursive === false) params.set("recursive", "false");
  const url = `/api/spaces/${encodeURIComponent(spaceName)}/files` + (params.toString() ? `?${params}` : "");
  const res = await fetch(url, { headers: await authHeaders() });
  if (!res.ok) {
    try { return (await res.json()) as ErrorEnvelope; } catch { return { error: { code: "HTTP_ERROR", message: String(res.status) } }; }
  }
  const json = (await res.json()) as ListFilesResponse;
  return json;
}

export async function readSpaceFile(
  spaceName: string,
  path: string
): Promise<{ contentBase64: string; contentType: string; size: number } | ErrorEnvelope> {
  const cleanPath = normalizePath(path);
  const url = `/api/spaces/${encodeURIComponent(spaceName)}/files/${cleanPath.split("/").map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, { headers: await authHeaders() });
  if (!res.ok) {
    try { return (await res.json()) as ErrorEnvelope; } catch { return { error: { code: "HTTP_ERROR", message: String(res.status) } }; }
  }
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buf = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  return { contentBase64: base64, contentType, size: buf.byteLength };
}

export async function writeSpaceFile(
  spaceName: string,
  path: string,
  content: string,
  contentType: string,
  opts?: { ifNoneMatch?: '*' }
): Promise<WriteFileResponse | ErrorEnvelope> {
  const cleanPath = stripSpacePrefix(spaceName, normalizePath(path));
  const url = `/api/spaces/${encodeURIComponent(spaceName)}/files/${cleanPath.split("/").map(encodeURIComponent).join("/")}`;
  const headers: HeadersInit = await authHeaders({ "Content-Type": contentType });
  if (opts?.ifNoneMatch === '*') {
    (headers as any)["If-None-Match"] = '*';
  }
  const body = new TextEncoder().encode(content);
  let res = await fetch(url, { method: "PUT", headers, body });
  // If client sent If-None-Match: * but server reports conflict, retry once without the conditional to perform an overwrite.
  if (res.status === 409 && opts?.ifNoneMatch === '*') {
    const overwriteHeaders: HeadersInit = await authHeaders({ "Content-Type": contentType });
    res = await fetch(url, { method: "PUT", headers: overwriteHeaders, body });
  }
  if (!res.ok) {
    try { return (await res.json()) as ErrorEnvelope; } catch { return { error: { code: "HTTP_ERROR", message: String(res.status) } }; }
  }
  return (await res.json()) as WriteFileResponse;
}

export async function listSpaces(): Promise<ListSpacesResponse | ErrorEnvelope> {
  const res = await fetch('/api/spaces', { headers: await authHeaders() });
  if (!res.ok) {
    try { return (await res.json()) as ErrorEnvelope; } catch { return { error: { code: 'HTTP_ERROR', message: String(res.status) } }; }
  }
  return (await res.json()) as ListSpacesResponse;
}

export async function createSpace(name: string): Promise<{ created: boolean } | ErrorEnvelope> {
  const res = await fetch('/api/spaces', {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    try { return (await res.json()) as ErrorEnvelope; } catch { return { error: { code: 'HTTP_ERROR', message: String(res.status) } }; }
  }
  return (await res.json()) as { created: boolean };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  // btoa expects binary string
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

function normalizeDir(dir?: string): string | undefined {
  if (!dir) return undefined;
  const trimmed = dir.trim();
  if (trimmed === '' || trimmed === '/' || trimmed === './') return undefined;
  return trimmed.replace(/^\/+/, '');
}

function normalizePath(p: string): string {
  const trimmed = (p || '').trim();
  const noLeading = trimmed.replace(/^\/+/, '');
  return noLeading.replace(/\/+/, '/');
}

function stripSpacePrefix(spaceName: string, relativePath: string): string {
  const prefix = `${spaceName}/`;
  if (relativePath.startsWith(prefix)) return relativePath.substring(prefix.length);
  return relativePath;
}


