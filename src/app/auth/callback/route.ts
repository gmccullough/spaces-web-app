import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Sanitize next to avoid open redirects; only allow relative paths
  const rawNext = url.searchParams.get('next') || '/spaces';
  const next = /^\//.test(rawNext) ? rawNext : '/spaces';

  // Prepare response we can attach cookies to
  // On Render, request.url may have origin https://localhost:10000 due to internal port proxy.
  // Prefer the public site URL if provided.
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = publicOrigin || url.origin;
  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Ensure cookie is set for the current origin
          response.cookies.set({
            name,
            value,
            httpOnly: options?.httpOnly ?? true,
            sameSite: options?.sameSite ?? 'lax',
            secure: options?.secure ?? false,
            path: options?.path ?? '/',
            expires: options?.expires,
            maxAge: options?.maxAge,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            httpOnly: options?.httpOnly ?? true,
            sameSite: options?.sameSite ?? 'lax',
            secure: options?.secure ?? false,
            path: options?.path ?? '/',
            maxAge: 0,
          });
        },
      },
    }
  );

  const code = url.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}

