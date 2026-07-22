import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

/**
 * Server component: if the visitor already has a valid session, skip the form and send
 * them to the dashboard. Otherwise render the magic-link request form.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-ink">
            Road to the Closing Table
          </h1>
          <p className="mt-1 text-muted">Free Investor Toolkit</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-8">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          We&apos;ll email you a secure sign-in link. No password needed.
        </p>
      </div>
    </div>
  );
}
