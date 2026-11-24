import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand-mark";
import "../brand-os.css";

/**
 * Server component: if already signed in, go to the dashboard; otherwise render the
 * email + password form (sign in / create account / forgot password) in the Closing
 * Table OS command-center brand style.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[]; error?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  // ?mode=signup opens on "Create account" (marketing pages link here); ?mode=forgot opens on
  // "Reset password" (GHL's welcome email uses it as a never-expiring "Set your password"
  // link). Anything else shows sign-in.
  const { mode, error } = await searchParams;
  const initialMode = mode === "signup" || mode === "forgot" ? mode : "signin";
  const notice =
    error === "link_expired" || error === "invalid_link" || error === "reset_expired"
      ? "That link expired or was already used. Sign in below."
      : undefined;

  return (
    <div className="os-scope">
      <div className="os-login-wrap">
        <div className="os-login-card">
          <div className="os-brand" style={{ justifyContent: "center", marginBottom: 26 }}>
            <BrandMark />
            <div>
              <div className="os-brand-name">Closing Table OS</div>
            </div>
          </div>

          <div className="os-panel" style={{ padding: "30px 30px 32px" }}>
            <LoginForm initialMode={initialMode} notice={notice} />
          </div>

          <p style={{ textAlign: "center", color: "var(--os-fg-3)", fontSize: 12, marginTop: 18 }}>
            Free tools for real estate investors — Max Offer, Funding Path, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
