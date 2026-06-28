"use client";

import { useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import type { AuthProfileState, ProfileRow } from "@/lib/map/types";

type InviteCodeResult = {
  invite_code: string;
  invite_code_updated_at: string | null;
};

export function EmployeeInvitePanel({
  auth,
  profiles,
}: {
  auth: AuthProfileState;
  profiles: ProfileRow[];
}) {
  const [inviteCode, setInviteCode] = useState(auth.organization?.invite_code ?? "");
  const [updatedAt, setUpdatedAt] = useState(
    auth.organization?.invite_code_updated_at ?? null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inviteLink = useMemo(() => {
    if (!inviteCode || typeof window === "undefined") return "";
    return `${window.location.origin}/join/${inviteCode}`;
  }, [inviteCode]);

  async function copyText(label: string, value: string) {
    if (!value) return;

    await window.navigator.clipboard.writeText(value);
    setMessage(`${label} copied.`);
  }

  async function regenerateInviteCode() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !auth.organization) {
      setMessage("Cloud Mode is not ready.");
      return;
    }
    if (
      !window.confirm(
        "Regenerate the invite code? Existing invite links will stop working.",
      )
    ) {
      return;
    }

    setIsPending(true);
    const { data, error } = await supabase.rpc(
      "regenerate_organization_invite_code" as never,
      { target_organization_id: auth.organization.id } as never,
    );
    setIsPending(false);

    if (error) {
      setMessage(formatSupabaseError(error));
      return;
    }

    const result = Array.isArray(data)
      ? (data[0] as InviteCodeResult | undefined)
      : null;
    if (
      result &&
      typeof result.invite_code === "string"
    ) {
      setInviteCode(result.invite_code);
      setUpdatedAt(result.invite_code_updated_at);
      setMessage("Invite code regenerated.");
    } else {
      setMessage("Invite code regenerated. Refresh this page to view it.");
    }
  }

  return (
    <div className="mt-5 grid gap-4">
      <section className="rounded-3xl bg-zinc-100 p-4">
        <p className="text-xs font-bold uppercase text-zinc-500">
          Organization
        </p>
        <h2 className="mt-1 text-lg font-black">
          {auth.organization?.name ?? "Organization"}
        </h2>

        <div className="mt-4 rounded-3xl bg-white p-4">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Invite code
          </p>
          <p className="mt-1 break-all text-3xl font-black tracking-[0.12em]">
            {inviteCode || "Unavailable"}
          </p>
          {updatedAt ? (
            <p className="mt-1 text-xs font-bold text-zinc-500">
              Updated {new Date(updatedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-black text-white disabled:opacity-50"
            type="button"
            disabled={!inviteCode}
            onClick={() => void copyText("Invite code", inviteCode)}
          >
            <Copy size={17} />
            Copy Code
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-black text-white disabled:opacity-50"
            type="button"
            disabled={!inviteLink}
            onClick={() => void copyText("Invite link", inviteLink)}
          >
            <Copy size={17} />
            Copy Link
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-black text-zinc-950 ring-1 ring-zinc-200 disabled:opacity-50"
            type="button"
            disabled={isPending}
            onClick={regenerateInviteCode}
          >
            <RefreshCw size={17} />
            Regenerate
          </button>
        </div>

        {inviteLink ? (
          <p className="mt-3 break-all rounded-2xl bg-white p-3 text-sm font-bold text-zinc-700">
            {inviteLink}
          </p>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-zinc-700">
            {message}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-base font-black">Active users</h2>
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-100 p-3"
              key={profile.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{profile.full_name}</p>
                <p className="truncate text-xs font-semibold text-zinc-600">
                  {profile.email}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black">
                {profile.active ? profile.role : "inactive"}
              </span>
            </div>
          ))}
          {!profiles.length ? (
            <p className="rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-600">
              No profiles found for this organization.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
