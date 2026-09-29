"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

/** Sets the new password on the session established by the reset-email link. */
export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus("error");
      setError("Passwords don't match.");
      return;
    }
    setStatus("working");
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    // Full navigation so the server sees the refreshed session cookies.
    window.location.assign("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="os-label" htmlFor="new-password">
        New password
      </label>
      <input
        id="new-password"
        className="os-input"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <label className="os-label" htmlFor="confirm-password" style={{ marginTop: 14 }}>
        Confirm new password
      </label>
      <input
        id="confirm-password"
        className="os-input"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Same password again"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      {status === "error" && (
        <p style={{ color: "#FF7A93", fontSize: 13, margin: "12px 0 0" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "working"}
        className="os-btn os-btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 18, opacity: status === "working" ? 0.6 : 1 }}
      >
        {status === "working" ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
