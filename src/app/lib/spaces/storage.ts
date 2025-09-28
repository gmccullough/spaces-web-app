import { createServerSupabase } from "@/app/lib/supabase/server";
import { FileEntry, PutOptions, WriteFileResponse } from "./types";
import { normalizeRelativePath } from "./paths";

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "spaces";
const DEFAULT_MAX_BYTES = Number(process.env.SUPABASE_MAX_OBJECT_BYTES || 5 * 1024 * 1024);

export async function listFiles(prefix: string, opts?: { dir?: string; recursive?: boolean }): Promise<FileEntry[]> {
  const supabase = await createServerSupabase();
  const dir = opts?.dir ? normalizeRelativePath(opts.dir) + "/" : "";
  const base = prefix + dir;

  // Supabase Storage list supports `search` and `limit` but not deep recursion in one call.
  // We'll default to recursive by paginating via `list` with `search` prefix if requested.
  const recursive = opts?.recursive !== false;

  if (!recursive) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(base, { limit: 1000 });
    if (error) throw error;
    return (data || []).filter(i => i.metadata /* files have metadata; folders typically do not */).map(i => ({
      path: (dir + i.name),
      name: i.name,
      size: i.metadata?.size ?? 0,
      contentType: i.metadata?.mimetype || undefined,
      updatedAt: i.updated_at || undefined,
    }));
  }

  // Recursive: list current and subfolders by traversing
  const results: FileEntry[] = [];
  await traverse(base, async (entry) => { results.push(entry); });
  return results;

  async function traverse(current: string, onFile: (e: FileEntry) => void) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(current, { limit: 1000 });
    if (error) throw error;
    for (const item of data || []) {
      if (!item.metadata) {
        // folder
        await traverse(current + item.name + "/", onFile);
      } else {
        onFile({
          path: (current.replace(prefix, "") + item.name),
          name: item.name,
          size: item.metadata?.size ?? 0,
          contentType: item.metadata?.mimetype || undefined,
          updatedAt: item.updated_at || undefined,
        });
      }
    }
  }
}

export async function getFile(objectKey: string): Promise<{ bytes: ArrayBuffer; contentType?: string }> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(objectKey);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  // Unfortunately download doesn't expose mimetype directly; we can attempt to head via createSignedUrl if needed.
  // For now, leave contentType undefined; route will set fallback based on path.
  return { bytes: arrayBuffer, contentType: undefined };
}

export async function putFile(objectKey: string, body: ArrayBuffer, contentType: string, opts?: PutOptions): Promise<WriteFileResponse> {
  if (!contentType) {
    const err = new Error("Missing Content-Type") as Error & { code?: string };
    err.code = "UNSUPPORTED_MEDIA_TYPE";
    throw err;
  }
  if (body.byteLength > DEFAULT_MAX_BYTES) {
    const err = new Error("Request body too large") as Error & { code?: string };
    err.code = "REQUEST_TOO_LARGE";
    throw err;
  }
  const supabase = await createServerSupabase();

  if (opts?.ifNoneMatch === '*') {
    const { data: existsData } = await supabase.storage.from(STORAGE_BUCKET).list(objectKey.substring(0, objectKey.lastIndexOf('/') + 1));
    const name = objectKey.substring(objectKey.lastIndexOf('/') + 1);
    const exists = (existsData || []).some(i => i.name === name);
    if (exists) {
      const err = new Error("Object already exists") as Error & { code?: string };
      err.code = "CONFLICT";
      throw err;
    }
  }

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(objectKey, body, { contentType, upsert: true });
  if (error) throw error;
  return { path: objectKey, size: body.byteLength, contentType, etag: (data as any)?.etag };
}


