"use client";

import { useRef, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { LEAD_STAGES, isActiveStage, type LeadStage } from "@/lib/pipeline";
import { createLead, deleteLead, updateLead } from "./actions";
import { IconLayers } from "../icons";

export interface LeadRow {
  id: string;
  nickname: string;
  contactName: string;
  contactInfo: string;
  source: string;
  stage: LeadStage;
  notes: string;
  nextFollowUp: string | null;
  reportCount: number;
}

const todayISO = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local tz

/** ISO date `days` from now (local tz). */
function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

/** How soon nudging starts, in days before the follow-up date. Gio's call: one week. */
export const FOLLOW_UP_WINDOW_DAYS = 7;

function followUpTone(date: string | null, stage: LeadStage): "overdue" | "today" | "soon" | "later" | null {
  if (!date || !isActiveStage(stage)) return null;
  const today = todayISO();
  if (date < today) return "overdue";
  if (date === today) return "today";
  if (date <= isoInDays(FOLLOW_UP_WINDOW_DAYS)) return "soon";
  return "later";
}

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function PipelineView({ leads }: { leads: LeadRow[] }) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const dueCount = leads.filter((l) => {
    const t = followUpTone(l.nextFollowUp, l.stage);
    return t === "overdue" || t === "today" || t === "soon";
  }).length;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  function addLead() {
    const nickname = newName.trim();
    if (!nickname) {
      // The button must always respond: point the user at the input instead of ignoring the click.
      setHint("Type the property address or a nickname first, then hit Add Lead.");
      addInputRef.current?.focus();
      return;
    }
    setHint("");
    setNewName("");
    run(() => createLead({ nickname }));
    addInputRef.current?.focus(); // ready for the next one
  }

  const inputStyle: CSSProperties = { padding: "9px 12px", fontSize: 14 };

  return (
    <div className="os-scope">
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "34px 22px 60px" }}>
        <div className="os-topbar" style={{ marginBottom: 26 }}>
          <div className="os-brand">
            <span className="os-brand-mark">
              <IconLayers style={{ width: 20, height: 20, color: "#fff" }} />
            </span>
            <div>
              <div className="os-brand-eyebrow">Closing Table OS</div>
              <div className="os-brand-name">Lead Pipeline</div>
            </div>
          </div>
          <Link className="os-btn os-btn-ghost" href="/dashboard" style={{ padding: "10px 16px" }}>
            ← Dashboard
          </Link>
        </div>

        <div className="os-eyebrow">— Work Your Leads</div>
        <h1 className="os-title" style={{ fontSize: 34 }}>Your Pipeline</h1>
        <p className="os-sub" style={{ marginBottom: 20 }}>
          {leads.length === 0
            ? "Every deal starts as a lead. Add your first one below."
            : `${leads.filter((l) => isActiveStage(l.stage)).length} active · ${dueCount} follow-up${dueCount === 1 ? "" : "s"} due within a week`}
        </p>

        {/* quick add */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <input
            ref={addInputRef}
            className="os-input"
            style={{ ...inputStyle, flex: "1 1 320px", maxWidth: 460 }}
            placeholder="Property address or nickname — e.g. 614 Maple St, Springdale"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (hint) setHint("");
            }}
            onKeyDown={(e) => e.key === "Enter" && addLead()}
          />
          <button type="button" className="os-btn os-btn-primary" onClick={addLead} disabled={pending} style={{ padding: "10px 20px" }}>
            + Add Lead
          </button>
        </div>
        {hint && <p style={{ color: "var(--os-orange)", fontSize: 13, margin: "6px 0 0" }}>{hint}</p>}
        {error && <p style={{ color: "#FF7A93", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}

        {/* board */}
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBlock: 18, alignItems: "flex-start" }}>
          {LEAD_STAGES.map((stage) => {
            const cards = leads.filter((l) => l.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="os-panel"
                style={{ flex: "0 0 262px", minHeight: 140, padding: 14, display: "grid", gap: 10, alignContent: "start" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="os-kicker" style={{ color: stage.accent }}>
                    ● {stage.label}
                  </span>
                  <span style={{ fontFamily: "var(--os-mono)", fontSize: 11, color: "var(--os-fg-3)" }}>{cards.length}</span>
                </div>

                {cards.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--os-fg-3)", margin: 0 }}>No leads here.</p>
                )}

                {cards.map((l) => {
                  const tone = followUpTone(l.nextFollowUp, l.stage);
                  const open = openId === l.id;
                  return (
                    <div
                      key={l.id}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${tone === "overdue" ? "rgba(255,122,147,0.5)" : "var(--os-line)"}`,
                        borderRadius: 12,
                        padding: "12px 12px 10px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : l.id)}
                        style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
                        title={open ? "Collapse" : "Edit details"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{l.nickname}</div>
                          <span
                            style={{
                              fontFamily: "var(--os-mono)",
                              fontSize: 10,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--os-lime)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {open ? "▴ Collapse" : "▾ Expand"}
                          </span>
                        </div>
                        {(l.contactName || l.contactInfo) && (
                          <div style={{ fontSize: 12, color: "var(--os-fg-2)", marginTop: 3 }}>
                            {[l.contactName, l.contactInfo].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7, fontSize: 11.5 }}>
                          {l.nextFollowUp && tone && (
                            <span
                              style={{
                                fontFamily: "var(--os-mono)",
                                color:
                                  tone === "overdue"
                                    ? "#FF7A93"
                                    : tone === "today"
                                      ? "var(--os-orange)"
                                      : tone === "soon"
                                        ? "var(--os-teal)"
                                        : "var(--os-fg-3)",
                              }}
                            >
                              {tone === "overdue" ? "⚠ " : "⏰ "}
                              {tone === "today" ? "Today" : fmtDate(l.nextFollowUp)}
                            </span>
                          )}
                          {l.reportCount > 0 && (
                            <span style={{ fontFamily: "var(--os-mono)", color: "var(--os-teal)" }}>
                              {l.reportCount} report{l.reportCount === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </button>

                      <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                        <select
                          className="os-input"
                          value={l.stage}
                          disabled={pending}
                          onChange={(e) => run(() => updateLead(l.id, { stage: e.target.value as LeadStage }))}
                          style={{ padding: "5px 8px", fontSize: 12, flex: 1 }}
                          aria-label="Stage"
                        >
                          {LEAD_STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <Link
                          href={`/tools/max-offer?address=${encodeURIComponent(l.nickname)}`}
                          target="_blank"
                          rel="opener"
                          className="os-btn os-btn-ghost"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          title="Run this property through the Max Offer Calculator"
                        >
                          Analyze
                        </Link>
                      </div>

                      {open && (
                        <LeadEditor
                          lead={l}
                          pending={pending}
                          onSave={(patch) => run(() => updateLead(l.id, patch))}
                          onDelete={() => {
                            setOpenId(null);
                            run(() => deleteLead(l.id));
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12.5, color: "var(--os-fg-3)" }}>
          Tip: name leads by property address — saved Max Offer reports for the same address attach automatically.
        </p>
      </div>
    </div>
  );
}

function LeadEditor({
  lead,
  pending,
  onSave,
  onDelete,
}: {
  lead: LeadRow;
  pending: boolean;
  onSave: (patch: {
    contactName: string;
    contactInfo: string;
    source: string;
    notes: string;
    nextFollowUp: string | null;
  }) => void;
  onDelete: () => void;
}) {
  const [contactName, setContactName] = useState(lead.contactName);
  const [contactInfo, setContactInfo] = useState(lead.contactInfo);
  const [source, setSource] = useState(lead.source);
  const [notes, setNotes] = useState(lead.notes);
  const [followUp, setFollowUp] = useState(lead.nextFollowUp ?? "");

  const small: CSSProperties = { padding: "7px 10px", fontSize: 12.5 };

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10, borderTop: "1px solid var(--os-line)", paddingTop: 10 }}>
      <input className="os-input" style={small} placeholder="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      <input className="os-input" style={small} placeholder="Phone / email" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
      <input className="os-input" style={small} placeholder="Source (referral, driving for dollars…)" value={source} onChange={(e) => setSource(e.target.value)} />
      <label style={{ fontSize: 11, color: "var(--os-fg-3)", display: "grid", gap: 4 }}>
        Next follow-up
        <input className="os-input" style={small} type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      </label>
      <textarea className="os-input" style={{ ...small, minHeight: 70, resize: "vertical" }} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <button
          type="button"
          className="os-btn os-btn-primary"
          disabled={pending}
          style={{ padding: "7px 14px", fontSize: 12.5 }}
          onClick={() => onSave({ contactName, contactInfo, source, notes, nextFollowUp: followUp || null })}
        >
          Save
        </button>
        <button
          type="button"
          className="os-btn os-btn-ghost"
          disabled={pending}
          style={{ padding: "7px 12px", fontSize: 12.5, color: "#FF7A93" }}
          onClick={() => {
            if (window.confirm(`Delete "${lead.nickname}"? This can't be undone.`)) onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
