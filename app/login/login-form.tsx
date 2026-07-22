"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link request form. Uses the BROWSER Supabase client (anon key) to ask Supabase to
 * email a one-time sign-in link. We never handle a password — Supabase generates a
 * single-use, time-limited link and emails it via the SMTP provider configured in
 * Supabase Auth (Resend/Postmark — NOT GHL, see ghl-integration.md).
 *
 * Why magic-link over passwords: lowest signup friction for a free tool, and there's no
 * password for us to store, leak, or for a user to reuse from a breached site.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Supabase must have this URL in its Auth "Redirect URLs" allow-list — NOT a
        // wildcard (security checklist #5). Add http://localhost:3000/auth/callback for
        // dev and the production URL for prod.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center">
        <p className="text-lg font-medium text-ink">Check your email</p>
        <p className="mt-2 text-sm text-muted">
          We sent a sign-in link to <strong>{email}</strong>. Click it to
          continue — the link expires shortly and can only be used once.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-ink"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-ink px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
