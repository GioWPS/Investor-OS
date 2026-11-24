import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./update-password-form";
import { BrandMark } from "@/components/brand-mark";
import "../brand-os.css";

/**
 * Two ways in, both through a link emailed to the person (that's what proves they own the
 * inbox, so it's safe to let them set a password here):
 *  • Password reset → /auth/callback?next=/update-password
 *  • First password for a website-calculator account → /auth/confirm sends people with
 *    needs_password here as /update-password?setup=1&next=<their report>. The OS layout
 *    also sends them here if they arrive any other way before setting one.
 */
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string | string[]; next?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session = they navigated here directly (or the link expired). Nothing to do.
  if (!user) redirect("/login?error=reset_expired");

  const params = await searchParams;
  const setup = params.setup === "1" || user.user_metadata?.needs_password === true;
  // Same-site paths only (open-redirect protection).
  const rawNext = typeof params.next === "string" ? params.next : "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

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
            <div className="os-eyebrow" style={{ textAlign: "center" }}>— The Closing Table</div>
            <h1
              className="os-title"
              style={{ fontSize: 34, textAlign: "center", margin: "8px 0 6px" }}
            >
              {setup ? "Set your password" : "New password"}
            </h1>
            <p style={{ textAlign: "center", color: "var(--os-fg-2)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>
              {setup ? (
                <>
                  Your deal is saved. Set a password for <b style={{ color: "var(--os-fg)" }}>{user.email}</b> so
                  you can log in to the Closing Table OS from any device.
                </>
              ) : (
                <>
                  Choose a new password for <b style={{ color: "var(--os-fg)" }}>{user.email}</b>.
                </>
              )}
            </p>
            <UpdatePasswordForm next={next} setup={setup} />
          </div>
        </div>
      </div>
    </div>
  );
}
