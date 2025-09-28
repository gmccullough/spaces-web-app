import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/app/lib/supabase/server";
import { STORAGE_BUCKET } from "@/app/lib/spaces/storage";

export async function GET(_req: NextRequest) {
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
    const spaces = (data || []).filter((i: any) => !i.metadata).map((i: any) => i.name);
    return NextResponse.json({ spaces }, { status: 200 });
  } catch (err: any) {
    const code = err?.code || "INTERNAL_ERROR";
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status: 500 });
  }
}


