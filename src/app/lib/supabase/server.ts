import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({
              name,
              value,
              httpOnly: options?.httpOnly ?? true,
              sameSite: options?.sameSite ?? 'lax',
              secure: options?.secure ?? false,
              path: options?.path ?? '/',
              expires: options?.expires,
              maxAge: options?.maxAge,
            });
          } catch (_) {
            // In non-Route Handler/server action contexts, cookies.set throws.
            // Ignore writes; reads still work for auth.getUser().
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({
              name,
              value: '',
              httpOnly: options?.httpOnly ?? true,
              sameSite: options?.sameSite ?? 'lax',
              secure: options?.secure ?? false,
              path: options?.path ?? '/',
              maxAge: 0,
            });
          } catch (_) {
            // Ignore in disallowed contexts
          }
        },
      },
    }
  );
  return supabase;
}


