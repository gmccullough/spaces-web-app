import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/app/lib/supabase/server";
import { ListFilesResponse } from "@/app/lib/spaces/types";
import { listFiles, resolveSpacePrefix, normalizeRelativePath } from "@/app/lib/spaces/storage";

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const url = new URL(req.url);
    const dirParam = url.searchParams.get("dir") || undefined;
    const recursiveParam = url.searchParams.get("recursive");
    const recursive = recursiveParam === null ? true : recursiveParam !== "false";

    const prefix = resolveSpacePrefix(user.id, params.name);
    const dir = dirParam ? normalizeRelativePath(dirParam) : undefined;
    const files = await listFiles(prefix, { dir, recursive });
    const body: ListFilesResponse = { files };
    return NextResponse.json(body, { status: 200 });
  } catch (err: any) {
    const code = err?.code || "INTERNAL_ERROR";
    const status = code === "INVALID_PATH" ? 400 : 500;
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status });
  }
}


