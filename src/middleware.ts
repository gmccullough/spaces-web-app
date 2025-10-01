import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const needsAuth = pathname.startsWith('/spaces') || pathname.startsWith('/api/session') || pathname.startsWith('/api/responses');
  if (pathname.startsWith('/auth/callback')) return NextResponse.next();
  if (!needsAuth) return NextResponse.next();

  // Avoid network calls in middleware; check for presence of any Supabase auth cookie.
  // Cookie names look like: sb-<project-ref>-auth-token
  // Supabase may chunk session cookie into `.0`, `.1` parts; match any name containing `-auth-token`.
  const hasAuthCookie = req.cookies.getAll().some((c) =>
    c.name.startsWith('sb-') && c.name.includes('-auth-token') && !!c.value
  );

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/spaces/:path*', '/api/session', '/api/responses'],
};
