"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Soft prompt for accounts created from the GHL calculator page (they were signed in with a
 * one-time link and have no password yet). Shown while user_metadata.needs_password is true.
 * The password goes straight to Supabase Auth — the app never sees or stores it.
 */
export function SetPasswordBanner() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const { error } = await createClient().auth.updateUser({
      password,
      data: { needs_password: false },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    router.refresh(); // server re-reads the flag; the banner disappears
  }

  return (
    <form className="os-pw-banner" onSubmit={onSubmit}>
      <div className="os-pw-banner-text">
        <b>Set a password</b> so you can log in from any device.
      </div>
      <div className="os-pw-banner-row">
        <input
          id="set-password"
          className="os-input"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          aria-label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="os-btn os-btn-primary" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
      {status === "error" && <p className="os-pw-banner-error">{error}</p>}
    </form>
  );
}
