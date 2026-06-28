"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthProfileState } from "@/lib/map/types";

export type FeedbackType = "bug" | "idea" | "confusing" | "urgent";

export type FeedbackDraft = {
  type: FeedbackType;
  area: string;
  description: string;
  screenshotNote: string;
};

export type FeedbackRecord = FeedbackDraft & {
  id: string;
  submittedBy: string | null;
  createdAt: string;
};

const LOCAL_FEEDBACK_KEY = "glasswell.feedback.v1";

type SupabaseInsertTable = {
  insert(values: unknown): Promise<{ error: Error | null }>;
};

export function loadLocalFeedback(): FeedbackRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedbackRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(LOCAL_FEEDBACK_KEY);
    return [];
  }
}

export function saveLocalFeedback(record: FeedbackRecord) {
  if (typeof window === "undefined") return;

  const current = loadLocalFeedback();
  window.localStorage.setItem(
    LOCAL_FEEDBACK_KEY,
    JSON.stringify([record, ...current].slice(0, 100)),
  );
}

export async function submitFeedback(input: {
  auth: AuthProfileState;
  dataMode: "demo" | "cloud";
  draft: FeedbackDraft;
}) {
  const submittedBy =
    input.auth.profile?.full_name ?? input.auth.email ?? input.auth.userId ?? null;
  const record: FeedbackRecord = {
    ...input.draft,
    id: crypto.randomUUID(),
    submittedBy,
    createdAt: new Date().toISOString(),
  };

  if (input.dataMode === "demo") {
    saveLocalFeedback(record);
    return {
      ok: true as const,
      mode: "demo" as const,
      message: "Feedback saved locally in Demo Mode.",
      record,
    };
  }

  const client = getSupabaseBrowserClient();
  if (!client || !input.auth.organization?.id) {
    return {
      ok: false as const,
      message: "Connection issue. Your changes may not sync.",
      record,
    };
  }

  const feedbackTable = client.from("feedback") as unknown as SupabaseInsertTable;
  const { error } = await feedbackTable.insert({
    id: record.id,
    organization_id: input.auth.organization.id,
    type: record.type,
    page_area: record.area,
    description: record.description,
    screenshot_note: record.screenshotNote || null,
    submitted_by: input.auth.userId,
    created_at: record.createdAt,
  });

  if (error) {
    saveLocalFeedback(record);
    return {
      ok: false as const,
      message: "Connection issue. Your changes may not sync.",
      record,
    };
  }

  return {
    ok: true as const,
    mode: "cloud" as const,
    message: "Feedback submitted.",
    record,
  };
}
