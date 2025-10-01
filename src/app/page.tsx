import { redirect } from "next/navigation";
import LoginPage from "./page.client";
import { createServerSupabase } from "@/app/lib/supabase/server";

type PageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default async function Page({ searchParams }: PageProps) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/spaces");
  }

  const nextParam = searchParams?.next;
  const nextPath = typeof nextParam === "string" && nextParam.trim().length ? nextParam : "/spaces";

  return <LoginPage nextPath={nextPath} />;
}
