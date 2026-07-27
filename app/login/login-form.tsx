"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link request form. Uses the BROWSER Supabase client (anon/publishable key) to ask
 * Supabase to email a one-time sign-in link. No password is ever handled here — Supabase
 * generates a single-use, time-limited link, sent via the SMTP provider in Supabase Auth
 * (Resend/Postmark, never GHL). Styled to match the Closing Table OS command center.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Must be in Supabase Auth's Redirect URLs allow-list — never a wildcard (checklist #5).
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
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--os-display)", fontSize: 22, textTransform: "uppercase", margin: 0 }}>
          Check your email
        </p>
        <p style={{ color: "var(--os-fg-2)", fontSize: 14, marginTop: 10, lineHeight: 1.55 }}>
          We sent a sign-in link to <b style={{ color: "var(--os-fg)" }}>{email}</b>. Click it to
          continue — the link expires shortly and can only be used once.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="os-label" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        className="os-input"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {status === "error" && (
        <p style={{ color: "#FF7A93", fontSize: 13, margin: "12px 0 0" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="os-btn os-btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 18, opacity: status === "sending" ? 0.6 : 1 }}
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
