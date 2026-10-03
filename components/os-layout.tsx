import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { OsShell } from "@/components/os-shell";
import "@/app/brand-os.css";

/** Server wrapper for OsShell: loads the signed-in user's name for the sidebar avatar. */
export async function OsLayout({
  children,
  variant = "page",
}: {
  children: ReactNode;
  variant?: "page" | "tool";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", user.id)
    .single();
  const name = (profile?.first_name as string | null) || user.email || "?";

  return (
    <OsShell email={user.email ?? ""} initial={name.slice(0, 1).toUpperCase()} variant={variant}>
      {children}
    </OsShell>
  );
}
