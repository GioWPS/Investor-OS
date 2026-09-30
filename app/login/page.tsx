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
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="os-scope">
      <div className="os-login-wrap">
        <div className="os-login-card">
          <div className="os-brand" style={{ justifyContent: "center", marginBottom: 26 }}>
            <BrandMark />
            <div>
              <div className="os-brand-eyebrow">The Closing Table</div>
              <div className="os-brand-name">Closing Table OS</div>
            </div>
          </div>

          <div className="os-panel" style={{ padding: "30px 30px 32px" }}>
            <LoginForm />
          </div>

          <p style={{ textAlign: "center", color: "var(--os-fg-3)", fontSize: 12, marginTop: 18 }}>
            Free tools for real estate investors — Max Offer, Funding Path, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
