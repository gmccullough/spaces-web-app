import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/app/lib/supabase/server";
import { STORAGE_BUCKET, listFiles } from "@/app/lib/spaces/storage";
import { readManifest, ensureManifest, writeManifest } from "@/app/lib/spaces/manifest";
import { normalizeSegment, resolveSpacePrefix } from "@/app/lib/spaces/paths";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const prefix = `users/${user.id}/Spaces/`;
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(prefix, { limit: 1000 });
    if (error) {
      return NextResponse.json({ error: { code: error.name || "STORAGE_ERROR", message: error.message } }, { status: 500 });
    }
    const dirEntries = (data || []).filter((i: any) => !i.metadata);

    // Build items with lastUpdatedAt using manifest; fallback to scanning files once.
    const items = await Promise.all(dirEntries.map(async (i: any) => {
      const name: string = i.name;
      let lastUpdatedAt: string | null = null;
      try {
        // Ensure a manifest exists (idempotent create)
        const ensured = await ensureManifest(user.id, name);
        const existing = ensured.manifest || (await readManifest(user.id, name));
        if (existing?.last_updated_at) {
          lastUpdatedAt = existing.last_updated_at;
        } else {
          // Fallback: compute from files then persist manifest
          const spacePrefix = resolveSpacePrefix(user.id, name);
          const files = await listFiles(spacePrefix, { recursive: true });
          const max = files.reduce<string | null>((acc, f) => {
            if (!f.updatedAt) return acc;
            return !acc || new Date(f.updatedAt) > new Date(acc) ? f.updatedAt : acc;
          }, null);
          const now = new Date().toISOString();
          lastUpdatedAt = max || now;
          try {
            await writeManifest(user.id, name, { version: 1, name, created_at: existing?.created_at || now, last_updated_at: lastUpdatedAt });
          } catch {}
        }
      } catch {
        // Ignore errors per space
      }
      return { name, lastUpdatedAt };
    }));

    items.sort((a, b) => {
      const at = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
      const bt = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
      return bt - at;
    });

    const spaces = items.map(i => i.name);
    return NextResponse.json({ spaces, items }, { status: 200 });
  } catch (err: any) {
    console.error('[GET /api/spaces] error', {
      name: err?.name,
      code: err?.code,
      status: err?.status,
      message: err?.message,
      stack: err?.stack,
    });
    const code = err?.code || "INTERNAL_ERROR";
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string | undefined;
  let spaceName: string | undefined;
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }
    userId = user.id;

    const body = await req.json().catch(() => null);
    const rawName = body?.name;
    if (!rawName || typeof rawName !== 'string') {
      return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Missing or invalid 'name'" } }, { status: 400 });
    }
    spaceName = normalizeSegment(rawName);

    try {
      const { created } = await ensureManifest(userId, spaceName);
      return NextResponse.json({ created }, { status: created ? 201 : 200 });
    } catch (e: any) {
      console.error('[POST /api/spaces] ensureManifest failed', {
        userId,
        spaceName,
        name: e?.name,
        code: e?.code,
        status: e?.status,
        message: e?.message,
        stack: e?.stack,
      });
      const status = e?.status || 500;
      const code = e?.code || e?.name || 'MANIFEST_WRITE_FAILED';
      return NextResponse.json({ error: { code, message: e?.message || 'Failed to create space' } }, { status });
    }
  } catch (err: any) {
    console.error('[POST /api/spaces] unexpected error', {
      userId,
      spaceName,
      name: err?.name,
      code: err?.code,
      status: err?.status,
      message: err?.message,
      stack: err?.stack,
    });
    const code = err?.code || "INTERNAL_ERROR";
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status: 500 });
  }
}


