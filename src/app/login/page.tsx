"use client";
import React from "react";
import { createBrowserSupabase } from "@/app/lib/supabase/client";

export default function LoginPage() {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const [nextPath, setNextPath] = React.useState('/demo');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
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
      <button onClick={handleGoogle} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}>
        Continue with Google
      </button>
      <div style={{ marginTop: 24 }}>
        <h2>Email & Password</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <button
            disabled={busy}
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                  setError(error.message);
                  setBusy(false);
                  return;
                }
                window.location.href = nextPath;
              } catch (e: any) {
                setError(e?.message || 'Login failed');
                setBusy(false);
              }
            }}
            data-testid="sign-in"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          >
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
          {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}


