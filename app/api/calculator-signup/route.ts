import { NextResponse } from "next/server";
import { appUrl, createAdminClient } from "@/lib/supabase/admin";
import { corsHeaders, isAllowedOrigin } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  sendAuthEmailViaGhl,
  signupPayload,
  syncToGhl,
  toolCompletionPayload,
} from "@/lib/ghl";
import { buildMaxOfferRun, calculatorAnswerTags, parseCalculatorSignup } from "@/lib/tools/max-offer-run";

/**
 * POST /api/calculator-signup — called by the Max Offer Calculator on Henry's GHL page.
 *
 *  • NEW email      → create the account, save the run to their Reports (computed with the
 *                     server's own formula — never the page's numbers), and return a one-time
 *                     sign-in URL. The page redirects there; they land on that report, signed in.
 *  • EXISTING email → do NOT sign anyone in (anyone can type any email). Save the run as
 *                     pending and have GHL email the owner a sign-in link. Clicking it attaches
 *                     the run to their Reports (/auth/confirm).
 *
 * No email is sent by Supabase here; GHL sends everything. Guards: Origin allow-list (CORS),
 * a honeypot field, and rate limits per IP and per email.
 */

const LIMIT_PER_IP_PER_HOUR = 100; // generous: a whole event can share one Wi-Fi address
const LIMIT_PER_EMAIL_PER_HOUR = 5;
const MAX_BODY_BYTES = 20_000;
const DEV = process.env.NODE_ENV === "development";

function respond(origin: string, status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: corsHeaders(origin) });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, { dev: DEV })) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin!) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, { dev: DEV })) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const o = origin!;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return respond(o, 413, { error: "Request too large." });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return respond(o, 400, { error: "Invalid request." });
  }

  const parsed = parseCalculatorSignup(body);
  if (!parsed.ok) return respond(o, 400, { error: parsed.error });
  const { firstName, email, values, attribution, isBot } = parsed.data;

  // Honeypot filled → a bot. Answer like a normal returning-user submission, do nothing.
  if (isBot) return respond(o, 200, { status: "check_inbox" });

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[calculator-signup]", err instanceof Error ? err.message : err);
    return respond(o, 503, { error: "Signups are temporarily unavailable. Please try again soon." });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipOk = await checkRateLimit(admin, `ip:${ip}`, LIMIT_PER_IP_PER_HOUR);
  const emailOk = ipOk && (await checkRateLimit(admin, `email:${email}`, LIMIT_PER_EMAIL_PER_HOUR));
  if (!ipOk || !emailOk) {
    return respond(o, 429, { error: "Too many tries. Please wait a few minutes and try again." });
  }

  let run;
  try {
    run = buildMaxOfferRun(values, { attribution });
  } catch (err) {
    return respond(o, 400, { error: err instanceof Error ? err.message : "Invalid numbers." });
  }

  // Try to create the account. "Already registered" means it's an existing email.
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      needs_password: true,
      signup_source: "calculator_page",
      ...(Object.keys(attribution).length ? { signup_attribution: attribution } : {}),
    },
  });

  if (created.error && !isAlreadyRegistered(created.error)) {
    console.error("[calculator-signup] createUser failed:", created.error.message);
    return respond(o, 500, { error: "Something went wrong. Please try again." });
  }

  // ── New email ─────────────────────────────────────────────────────────────────────────
  if (!created.error && created.data.user) {
    const userId = created.data.user.id;

    const { data: saved, error: saveError } = await admin
      .from("tool_results")
      .insert({ user_id: userId, ...run.row })
      .select("id")
      .single();
    if (saveError || !saved) {
      console.error("[calculator-signup] save failed:", saveError?.message);
      return respond(o, 500, { error: "Your account was created, but we couldn't save this deal. Please sign in and run it again." });
    }

    await admin
      .from("profiles")
      .update({ ...(run.stage ? { stage: run.stage } : {}), ghl_synced_at: new Date().toISOString() })
      .eq("id", userId);

    const name = { firstName };
    await syncToGhl(signupPayload(email, name), { userId, logWith: admin });
    await syncToGhl(
      toolCompletionPayload({
        email,
        name,
        tool: "max_offer",
        stage: run.stage,
        answers: calculatorAnswerTags(values),
        customFields: {
          max_offer: Math.round(run.analysis.maxOffer),
          offer_gap: Math.round(run.analysis.gap),
        },
      }),
      { userId, tool: "max_offer", logWith: admin },
    );

    const link = await signInLink(admin, email, `/tools/max-offer/history?report=${saved.id}`);
    if (!link) {
      return respond(o, 500, { error: "Your deal is saved. Please sign in from the app to see it." });
    }
    return respond(o, 200, { status: "signed_in", redirect: link });
  }

  // ── Existing email ────────────────────────────────────────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("email", email)
    .maybeSingle();
  if (!profile) {
    console.error("[calculator-signup] existing auth user without a profile row");
    return respond(o, 500, { error: "Something went wrong. Please try again." });
  }

  const { data: pending, error: pendingError } = await admin
    .from("pending_runs")
    .insert({ user_id: profile.id, ...run.row })
    .select("id")
    .single();
  if (pendingError || !pending) {
    console.error("[calculator-signup] pending save failed:", pendingError?.message);
    return respond(o, 500, { error: "Something went wrong. Please try again." });
  }

  const link = await signInLink(admin, email, `/tools/max-offer/history?report=${pending.id}`);
  if (!link) return respond(o, 500, { error: "Something went wrong. Please try again." });

  try {
    // Name comes from OUR profile, never from this submission — otherwise anyone could
    // rename someone else's GHL contact by typing their email.
    await sendAuthEmailViaGhl({
      email,
      name: { firstName: profile.first_name, lastName: profile.last_name },
      kind: "login",
      link,
    });
  } catch (err) {
    console.error("[calculator-signup] GHL login email failed:", err instanceof Error ? err.message : err);
    return respond(o, 502, { error: "We couldn't send your sign-in email right now. Please try again in a minute." });
  }

  return respond(o, 200, { status: "check_inbox", message: "Check your inbox" });
}

function isAlreadyRegistered(error: { message?: string; code?: string; status?: number }) {
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already (been )?registered|already exists/i.test(error.message ?? "")
  );
}

/**
 * One-time sign-in link that lands on `next`. Uses generateLink's hashed token with our own
 * /auth/confirm route (verifyOtp sets the session cookies server-side), rather than
 * Supabase's hosted link — that one returns tokens in a URL fragment our server can't read.
 */
async function signInLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  next: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[calculator-signup] generateLink failed:", error?.message);
    return null;
  }
  const url = new URL("/auth/confirm", appUrl());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "email");
  url.searchParams.set("next", next);
  return url.toString();
}
