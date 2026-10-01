import { NextResponse } from "next/server";
import { verifyStandardWebhook } from "@/lib/webhook-signature";
import { sendAuthEmailViaGhl, type AuthEmailKind } from "@/lib/ghl";

/**
 * Supabase Auth "Send Email" hook. With the hook enabled, Supabase does NOT send the
 * confirm-signup / reset-password emails itself — it POSTs them here, and we hand them to
 * GoHighLevel (via the Zap) to send. See sendAuthEmailViaGhl in lib/ghl.ts.
 *
 * Security: every request must carry a valid Standard Webhooks signature made with
 * SEND_EMAIL_HOOK_SECRET (server-only; set in Vercel, copied from Supabase → Auth → Hooks).
 * Anything unsigned is rejected, so nobody else can make GHL send emails.
 */

// Supabase email_action_type → which GHL email to send. Other types (email change, magic
// link, security notifications…) aren't used by this app; they're acknowledged, not sent.
const KINDS: Record<string, AuthEmailKind> = {
  signup: "signup",
  recovery: "recovery",
};

interface HookPayload {
  user?: {
    email?: string;
    user_metadata?: { first_name?: string; last_name?: string };
  };
  email_data?: {
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
}

function hookError(status: number, message: string) {
  // Supabase shows the hook's error message to the person as a failed request.
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const secret = process.env.SEND_EMAIL_HOOK_SECRET ?? "";
  const valid = verifyStandardWebhook({
    secret,
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
    rawBody,
  });
  if (!valid) return hookError(401, "Invalid signature");

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody) as HookPayload;
  } catch {
    return hookError(400, "Invalid JSON");
  }

  const email = payload.user?.email;
  const data = payload.email_data;
  const kind = data?.email_action_type ? KINDS[data.email_action_type] : undefined;

  if (!kind) {
    console.warn(`[auth-email] ignoring unsupported type "${data?.email_action_type}"`);
    return NextResponse.json({});
  }
  if (!email || !data?.token_hash) return hookError(400, "Missing email or token");

  // Same link Supabase would have put in its own email: verifies the token, then redirects
  // to our /auth/callback (confirm) or /update-password flow via redirect_to.
  const verifyUrl = new URL("/auth/v1/verify", process.env.NEXT_PUBLIC_SUPABASE_URL);
  verifyUrl.searchParams.set("token", data.token_hash);
  verifyUrl.searchParams.set("type", data.email_action_type!);
  verifyUrl.searchParams.set("redirect_to", data.redirect_to || data.site_url || "");

  try {
    await sendAuthEmailViaGhl({
      email,
      name: {
        firstName: payload.user?.user_metadata?.first_name,
        lastName: payload.user?.user_metadata?.last_name,
      },
      kind,
      link: verifyUrl.toString(),
    });
  } catch (err) {
    console.error("[auth-email] could not hand email to GHL:", err instanceof Error ? err.message : err);
    return hookError(502, "We couldn't send your email right now. Please try again in a minute.");
  }

  return NextResponse.json({});
}
