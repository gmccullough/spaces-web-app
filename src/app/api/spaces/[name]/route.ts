import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/app/lib/supabase/server';
import { getServiceRoleSupabase } from '@/app/lib/supabase/serviceRole';
import { STORAGE_BUCKET, listFiles } from '@/app/lib/spaces/storage';
import { readManifest, writeManifest } from '@/app/lib/spaces/manifest';
import { normalizeSegment, resolveSpacePrefix } from '@/app/lib/spaces/paths';

export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
  let userId: string | undefined;
  const currentRawName = params.name;
  let normalizedCurrentName: string | undefined;
  let normalizedNewName: string | undefined;
  try {
    const authClient = await createServerSupabase();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    userId = user.id;
    normalizedCurrentName = normalizeSegment(currentRawName);

    const body = await req.json().catch(() => null);
    const rawNewName = body?.newName;
    const newDisplayNameRaw = body?.displayName;
    if (!rawNewName || typeof rawNewName !== 'string') {
      return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: "Missing or invalid 'newName'" } }, { status: 400 });
    }
    normalizedNewName = normalizeSegment(rawNewName);
    const displayName = typeof newDisplayNameRaw === 'string' && newDisplayNameRaw.trim() ? newDisplayNameRaw.trim() : rawNewName;

    if (normalizedCurrentName === normalizedNewName) {
      return NextResponse.json({ error: { code: 'NO_OP', message: 'New name matches existing name' } }, { status: 400 });
    }

    // Ensure destination does not already exist
    const existingDest = await readManifest(userId, normalizedNewName);
    if (existingDest) {
      return NextResponse.json({ error: { code: 'ALREADY_EXISTS', message: 'A space with that name already exists' } }, { status: 409 });
    }

    const sourcePrefix = resolveSpacePrefix(userId, normalizedCurrentName);
    const destinationPrefix = resolveSpacePrefix(userId, normalizedNewName);

    // Ensure manifest/source exists before proceeding
    const existingManifest = await readManifest(userId, normalizedCurrentName);
    if (!existingManifest) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Space not found' } }, { status: 404 });
    }

    // List all files (recursive) and move to new prefix
    const storageClient = getServiceRoleSupabase() ?? authClient;

    const files = await listFiles(sourcePrefix, { recursive: true });
    const manifestKey = `${sourcePrefix}manifest.json`;
    let manifestExists = false;
    for (const file of files) {
      if (file.isDirectory) continue;
      const fromPath = sourcePrefix + file.path;
      if (fromPath === manifestKey) {
        manifestExists = true;
      }
      const toPath = destinationPrefix + file.path;
      const { error: moveError } = await storageClient.storage.from(STORAGE_BUCKET).move(fromPath, toPath);
      if (moveError) {
        const statusCode = (moveError as any)?.statusCode || (moveError as any)?.status;
        if (statusCode === '404' || statusCode === 404) {
          continue;
        }
        console.error('[PATCH /api/spaces/[name]] move failed', { fromPath, toPath, moveError });
        const status = statusCode || 500;
        const code = moveError.name || 'MOVE_FAILED';
        return NextResponse.json({ error: { code, message: moveError.message } }, { status });
      }
    }

    // Write updated manifest with new name and clear auto-generated flag
    const updatedManifest = {
      ...existingManifest,
      name: displayName,
      last_updated_at: new Date().toISOString(),
      is_name_auto_generated: false,
    };
    if (!manifestExists) {
      await writeManifest(userId, normalizedNewName, updatedManifest);
    }

    return NextResponse.json({ renamed: true, manifest: updatedManifest }, { status: 200 });
  } catch (err: any) {
    console.error('[PATCH /api/spaces/[name]] error', {
      userId,
      from: normalizedCurrentName,
      to: normalizedNewName,
      name: err?.name,
      code: err?.code,
      status: err?.status,
      message: err?.message,
      stack: err?.stack,
    });
    const status = err?.status || 500;
    const code = err?.code || err?.name || 'INTERNAL_ERROR';
    return NextResponse.json({ error: { code, message: err?.message || 'Internal Error' } }, { status });
  }
}
