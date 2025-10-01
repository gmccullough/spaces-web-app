import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

export function getServiceRoleSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (serviceRoleClient) return serviceRoleClient;
  serviceRoleClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });
  return serviceRoleClient;
}
