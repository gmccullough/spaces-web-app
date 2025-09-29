import { getFile, putFile } from '@/app/lib/spaces/storage';
import { resolveSpacePrefix } from '@/app/lib/spaces/paths';

export type SpaceManifestV1 = {
  version: 1;
  name: string;
  created_at: string; // ISO string (UTC)
  last_updated_at: string; // ISO string (UTC)
};

export function getManifestKey(userId: string, spaceName: string): string {
  return resolveSpacePrefix(userId, spaceName) + 'manifest.json';
}

export async function readManifest(userId: string, spaceName: string): Promise<SpaceManifestV1 | null> {
  const key = getManifestKey(userId, spaceName);
  try {
    const { bytes } = await getFile(key);
    const text = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(text);
    // Basic validation
    if (parsed && parsed.version === 1 && typeof parsed.name === 'string') {
      return parsed as SpaceManifestV1;
    }
    return null;
  } catch (err: any) {
    // Handle various storage errors that indicate file doesn't exist
    if (err?.name === 'StorageApiError' && err?.status === 404) return null;
    if (err?.name === 'StorageUnknownError') return null;
    throw err;
  }
}

export async function writeManifest(userId: string, spaceName: string, manifest: SpaceManifestV1): Promise<void> {
  const key = getManifestKey(userId, spaceName);
  const json = JSON.stringify(manifest);
  const bytes = new TextEncoder().encode(json).buffer;
  try {
    await putFile(key, bytes, 'application/json');
  } catch (e: any) {
    // Fallback: prime the space prefix with a zero-byte sentinel, then retry once
    try {
      const sentinelKey = resolveSpacePrefix(userId, spaceName) + '.keep';
      const empty = new Uint8Array(0).buffer;
      await putFile(sentinelKey, empty, 'application/octet-stream');
      await putFile(key, bytes, 'application/json');
    } catch (inner: any) {
      // Re-throw the original error context for upstream logging
      throw inner || e;
    }
  }
}

export async function ensureManifest(userId: string, spaceName: string): Promise<{ created: boolean; manifest: SpaceManifestV1 }> {
  const existing = await readManifest(userId, spaceName);
  if (existing) return { created: false, manifest: existing };
  const now = new Date().toISOString();
  const manifest: SpaceManifestV1 = { version: 1, name: spaceName, created_at: now, last_updated_at: now };
  await writeManifest(userId, spaceName, manifest);
  return { created: true, manifest };
}

export async function bumpManifestLastUpdated(userId: string, spaceName: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    const existing = await readManifest(userId, spaceName);
    if (existing) {
      const updated: SpaceManifestV1 = { ...existing, last_updated_at: now };
      await writeManifest(userId, spaceName, updated);
      return;
    }
    // If missing, create it
    const manifest: SpaceManifestV1 = { version: 1, name: spaceName, created_at: now, last_updated_at: now };
    await writeManifest(userId, spaceName, manifest);
  } catch {
    // Best-effort bump; ignore errors
  }
}


