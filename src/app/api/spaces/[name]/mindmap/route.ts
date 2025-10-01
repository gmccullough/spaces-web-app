import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/app/lib/supabase/server";
import { loadMindMapSnapshot, saveMindMapSnapshot } from "@/app/lib/spaces/storage";

export async function GET(req: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }
    const { name } = await context.params;
    const snapshot = await loadMindMapSnapshot(user.id, name);
    if (!snapshot) return NextResponse.json({ snapshot: null }, { status: 200 });
    return NextResponse.json({ snapshot }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    const code = err?.code || "INTERNAL_ERROR";
    const status = err?.status || 500;
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }
    const { name } = await context.params;
    const body = await req.json();
    const snapshot = body?.snapshot;
    if (!snapshot || typeof snapshot !== 'object') {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Missing snapshot" } }, { status: 400 });
    }
    const result = await saveMindMapSnapshot(user.id, name, snapshot);
    return NextResponse.json({ etag: result.etag, size: result.size }, { status: 200 });
  } catch (err: any) {
    const code = err?.code || "INTERNAL_ERROR";
    const status = err?.status || 500;
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status });
  }
}


