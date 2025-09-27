"use client";
import React from "react";
import { createBrowserSupabase } from "@/app/lib/supabase/client";

export default function LoginPage() {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const [nextPath, setNextPath] = React.useState('/demo');
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('next') || '/demo';
    setNextPath(p);
  }, []);

  const handleGoogle = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      return;
    }
    // Fallback: let Supabase use its default redirect
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Sign In</h1>
      <p>Use Google to continue.</p>
      <p>After login you will be redirected to: <code>{nextPath}</code></p>
      <button onClick={handleGoogle} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}>
        Continue with Google
      </button>
    </div>
  );
}


