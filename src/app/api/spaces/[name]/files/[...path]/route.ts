import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/app/lib/supabase/server";
import { getFile, putFile } from "@/app/lib/spaces/storage";
import { resolveSpacePrefix, normalizeRelativePath } from "@/app/lib/spaces/paths";

export async function GET(req: NextRequest, context: { params: Promise<{ name: string; path: string[] }> }) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { name, path } = await context.params;
    const relPath = normalizeRelativePath((path || []).join("/"));
    if (!relPath) {
      return NextResponse.json({ error: { code: "INVALID_PATH", message: "Empty path" } }, { status: 400 });
    }
    const objectKey = resolveSpacePrefix(user.id, name) + relPath;
    const { bytes, contentType } = await getFile(objectKey);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType || inferContentType(relPath) || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const code = err?.code || "INTERNAL_ERROR";
    const status = code === "INVALID_PATH" ? 400 : (err?.status || 500);
    if (err?.name === 'StorageApiError' && err?.status === 404) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 });
    }
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ name: string; path: string[] }> }) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { name, path } = await context.params;
    const relPath = normalizeRelativePath((path || []).join("/"));
    if (!relPath) {
      return NextResponse.json({ error: { code: "INVALID_PATH", message: "Empty path" } }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") || "";
    const ifNoneMatch = req.headers.get("if-none-match") as '*' | null;
    const objectKey = resolveSpacePrefix(user.id, name) + relPath;
    const arrayBuffer = await req.arrayBuffer();
    const result = await putFile(objectKey, arrayBuffer, contentType, { ifNoneMatch: ifNoneMatch === '*' ? '*' : undefined });
    const status = ifNoneMatch === '*' ? 201 : 200;
    return NextResponse.json({ path: relPath, size: result.size, contentType: result.contentType, etag: result.etag }, { status });
  } catch (err: any) {
    const code = err?.code || "INTERNAL_ERROR";
    const status = code === "INVALID_PATH" ? 400
      : code === "UNSUPPORTED_MEDIA_TYPE" ? 415
      : code === "REQUEST_TOO_LARGE" ? 413
      : code === "CONFLICT" ? 409
      : 500;
    return NextResponse.json({ error: { code, message: err?.message || "Internal Error" } }, { status });
  }
}

function inferContentType(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  return undefined;
}


