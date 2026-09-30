"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Email + password auth (Tazz's call, Sep 2026 — replaced the original magic-link-only
 * form). Three modes in one card: sign in, create account, forgot password.
 *
 * Uses the BROWSER Supabase client (publishable key, RLS-bound). Passwords are only ever
 * sent to Supabase Auth over HTTPS — the app never stores or logs them. Two emails still
 * flow through Supabase's SMTP (Resend once configured, never GHL):
 *   - "Confirm signup" — new accounts must click it before they can sign in. The click
 *     lands on /auth/callback, which is what fires the one-time GHL signup webhook.
 *   - "Reset password" — lands on /auth/callback?next=/update-password.
 */
type Mode = "signin" | "signup" | "forgot";

const COPY: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  signin: {
    title: "Sign in",
    subtitle: "Welcome back — enter your email and password.",
    cta: "Sign in",
  },
  signup: {
    title: "Create account",
    subtitle: "Free access to the toolkit. Takes 30 seconds.",
    cta: "Create my account",
  },
  forgot: {
    title: "Reset password",
    subtitle: "We'll email you a link to set a new password.",
    cta: "Email me a reset link",
  },
};

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError("");

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        // Supabase deliberately returns the same message for wrong password and unknown
        // email (so the form can't be used to probe which emails have accounts).
        setError(
          error.message === "Email not confirmed"
            ? "Please confirm your email first — check your inbox for the confirmation link."
            : "Email or password is incorrect.",
        );
        return;
      }
      // Full navigation (not router.push) so the fresh auth cookies are sent to the server.
      window.location.assign("/dashboard");
      return;
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Where the "Confirm signup" email lands. Must be in Supabase Auth's Redirect
          // URLs allow-list — never a wildcard (checklist #5).
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Saved on the auth user; the DB trigger copies them into profiles, and they go to
          // GHL with the signup event so the contact has a real name.
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
        },
      });
      if (error) {
        setStatus("error");
        setError(error.message);
        return;
      }
      // With confirmations on, signUp for an ALREADY-registered email returns a stub user
      // with no identities instead of an error — surface a helpful message.
      if (data.user && data.user.identities?.length === 0) {
        setStatus("error");
        setError("That email already has an account — sign in instead.");
        return;
      }
      setStatus("sent");
      return;
    }

    // mode === "forgot"
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--os-display)", fontSize: 22, textTransform: "uppercase", margin: 0 }}>
          Check your email
        </p>
        <p style={{ color: "var(--os-fg-2)", fontSize: 14, marginTop: 10, lineHeight: 1.55 }}>
          {mode === "signup" ? (
            <>
              We sent a confirmation link to <b style={{ color: "var(--os-fg)" }}>{email}</b>.
              Click it to activate your account, then sign in.
            </>
          ) : (
            <>
              We sent a password-reset link to <b style={{ color: "var(--os-fg)" }}>{email}</b>.
              Click it to choose a new password.
            </>
          )}
        </p>
        <button
          type="button"
          className="os-btn"
          style={{ marginTop: 18 }}
          onClick={() => switchMode("signin")}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const copy = COPY[mode];

  return (
    <form onSubmit={handleSubmit}>
      <div className="os-eyebrow" style={{ textAlign: "center" }}>— The Closing Table</div>
      <h1 className="os-title" style={{ fontSize: 34, textAlign: "center", margin: "8px 0 6px" }}>
        {copy.title}
      </h1>
      <p style={{ textAlign: "center", color: "var(--os-fg-2)", fontSize: 14, margin: "0 0 24px" }}>
        {copy.subtitle}
      </p>

      {mode === "signup" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label className="os-label" htmlFor="first-name">
              First name
            </label>
            <input
              id="first-name"
              className="os-input"
              type="text"
              required
              maxLength={80}
              autoComplete="given-name"
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="os-label" htmlFor="last-name">
              Last name
            </label>
            <input
              id="last-name"
              className="os-input"
              type="text"
              required
              maxLength={80}
              autoComplete="family-name"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
      )}

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

      {mode !== "forgot" && (
        <>
          <label className="os-label" htmlFor="password" style={{ marginTop: 14 }}>
            Password
          </label>
          <input
            id="password"
            className="os-input"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      )}

      {mode === "signin" && (
        <p style={{ textAlign: "right", margin: "8px 0 0" }}>
          <button type="button" className="os-linklike" onClick={() => switchMode("forgot")}>
            Forgot password?
          </button>
        </p>
      )}

      {status === "error" && (
        <p style={{ color: "#FF7A93", fontSize: 13, margin: "12px 0 0" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "working"}
        className="os-btn os-btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 18, opacity: status === "working" ? 0.6 : 1 }}
      >
        {status === "working" ? "One moment…" : copy.cta}
      </button>

      <p style={{ textAlign: "center", color: "var(--os-fg-3)", fontSize: 13, marginTop: 16 }}>
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button type="button" className="os-linklike" onClick={() => switchMode("signup")}>
              Create a free account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" className="os-linklike" onClick={() => switchMode("signin")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}
