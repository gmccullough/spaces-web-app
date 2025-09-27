import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/app/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Demo • Spaces',
};

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/demo');
  return (
    <>{children}</>
  );
}


