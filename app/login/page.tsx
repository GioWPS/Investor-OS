import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { IconLayers } from "../dashboard/icons";
import "../brand-os.css";

/**
 * Server component: if already signed in, go to the dashboard; otherwise render the
 * magic-link form in the Closing Table OS command-center brand style.
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
            <span className="os-brand-mark">
              <IconLayers style={{ width: 20, height: 20, color: "#fff" }} />
            </span>
            <div>
              <div className="os-brand-eyebrow">The Closing Table</div>
              <div className="os-brand-name">Free Toolkit</div>
            </div>
          </div>

          <div className="os-panel" style={{ padding: "30px 30px 32px" }}>
            <div className="os-eyebrow" style={{ textAlign: "center" }}>— The Closing Table</div>
            <h1
              className="os-title"
              style={{ fontSize: 34, textAlign: "center", margin: "8px 0 6px" }}
            >
              Sign in
            </h1>
            <p style={{ textAlign: "center", color: "var(--os-fg-2)", fontSize: 14, margin: "0 0 24px" }}>
              We&apos;ll email you a secure sign-in link. No password needed.
            </p>
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
