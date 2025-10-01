"use client";
import React from "react";
import Image from "next/image";
import { createBrowserSupabase } from "@/app/lib/supabase/client";

type LoginPageProps = {
  nextPath: string;
};

export default function LoginPage({ nextPath }: LoginPageProps) {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleGoogle = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo-new.png"
              alt="Spaces logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="uppercase text-5xl font-normal mb-12 text-gray-900 tracking-tight">Spaces</h1>
          <p className="mt-2 text-gray-600">Sign in to continue</p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogle}
            className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-gray-500">or</span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  setError(e?.message || "Login failed");
                  setBusy(false);
                }
              }}
              data-testid="sign-in"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}

