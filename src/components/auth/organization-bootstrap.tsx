"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthProfileState } from "@/lib/map/types";
import type { Database } from "@/lib/db/database.types";

export function OrganizationBootstrap({ auth }: { auth: AuthProfileState }) {
  const [name, setName] = useState("Glasswell Window Cleaning");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function createOrganization() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !auth.userId || !auth.email) {
      setMessage("Login is required before creating an organization.");
      return;
    }

    setIsPending(true);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const organizationInsert: Database["public"]["Tables"]["organizations"]["Insert"] = {
      name,
      slug: slug || `organization-${auth.userId.slice(0, 8)}`,
      branding: {},
      settings: {},
    };
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert(organizationInsert as never)
      .select("*")
      .single();

    if (organizationError || !organization) {
      setIsPending(false);
      setMessage(organizationError?.message ?? "Organization could not be created.");
      return;
    }
    const createdOrganization =
      organization as Database["public"]["Tables"]["organizations"]["Row"];

    const profileInsert: Database["public"]["Tables"]["profiles"]["Insert"] = {
      id: auth.userId,
      organization_id: createdOrganization.id,
      email: auth.email,
      full_name: auth.email.split("@")[0] ?? "Owner",
      role: "owner",
      active: true,
    };
    const { error: profileError } = await supabase
      .from("profiles")
      .insert(profileInsert as never);

    setIsPending(false);
    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/20 backdrop-blur">
      <p className="text-xs font-bold uppercase text-zinc-500">Cloud setup</p>
      <h2 className="mt-1 text-xl font-black">Create first organization</h2>
      <p className="mt-2 text-sm font-semibold text-zinc-600">
        Your account is logged in but does not have an active profile yet.
      </p>
      <input
        className="mt-3 h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {message ? (
        <p className="mt-3 rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-700">
          {message}
        </p>
      ) : null}
      <button
        className="mt-3 h-14 w-full rounded-3xl bg-zinc-950 text-base font-black text-white disabled:opacity-50"
        type="button"
        disabled={isPending || !name.trim()}
        onClick={createOrganization}
      >
        Create Organization
      </button>
    </div>
  );
}
