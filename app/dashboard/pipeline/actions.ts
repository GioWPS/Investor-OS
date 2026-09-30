"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLeadStage, type LeadStage } from "@/lib/pipeline";

/**
 * Pipeline server actions. The acting user is ALWAYS the session user (checklist #6);
 * every write is double-scoped by .eq("user_id") on top of RLS.
 */

export interface LeadPatch {
  nickname?: string;
  contactName?: string | null;
  contactInfo?: string | null;
  source?: string | null;
  stage?: LeadStage;
  notes?: string | null;
  nextFollowUp?: string | null; // YYYY-MM-DD or null to clear
}

export type LeadActionResult = { ok: true } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

function refresh() {
  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard");
}

export async function createLead(values: {
  nickname: string;
  stage?: LeadStage;
  nextFollowUp?: string | null;
}): Promise<LeadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const nickname = cleanText(values.nickname, 140);
  if (!nickname) return { ok: false, error: "Give the lead a property address or name." };
  const stage = isLeadStage(values.stage) ? values.stage : "cold";
  const nextFollowUp =
    typeof values.nextFollowUp === "string" && DATE_RE.test(values.nextFollowUp)
      ? values.nextFollowUp
      : null;

  const { error } = await supabase.from("leads").insert({
    user_id: user.id,
    nickname,
    stage,
    next_follow_up: nextFollowUp,
  });
  if (error) return { ok: false, error: "Could not save the lead. Please try again." };
  refresh();
  return { ok: true };
}

export async function updateLead(id: string, patch: LeadPatch): Promise<LeadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.nickname !== undefined) {
    const nickname = cleanText(patch.nickname, 140);
    if (!nickname) return { ok: false, error: "The lead needs a name." };
    row.nickname = nickname;
  }
  if (patch.contactName !== undefined) row.contact_name = cleanText(patch.contactName, 140);
  if (patch.contactInfo !== undefined) row.contact_info = cleanText(patch.contactInfo, 200);
  if (patch.source !== undefined) row.source = cleanText(patch.source, 140);
  if (patch.notes !== undefined) row.notes = cleanText(patch.notes, 4000);
  if (patch.stage !== undefined) {
    if (!isLeadStage(patch.stage)) return { ok: false, error: "Unknown stage." };
    row.stage = patch.stage;
  }
  if (patch.nextFollowUp !== undefined) {
    if (patch.nextFollowUp !== null && !DATE_RE.test(patch.nextFollowUp)) {
      return { ok: false, error: "Follow-up date must be a valid date." };
    }
    row.next_follow_up = patch.nextFollowUp;
  }

  const { error } = await supabase.from("leads").update(row).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not update the lead. Please try again." };
  refresh();
  return { ok: true };
}

export async function deleteLead(id: string): Promise<LeadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { error } = await supabase.from("leads").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not delete the lead. Please try again." };
  refresh();
  return { ok: true };
}
