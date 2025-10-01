import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/app/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Spaces',
};

export default async function SpacesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/spaces');
  return (
    <>{children}</>
  );
}

