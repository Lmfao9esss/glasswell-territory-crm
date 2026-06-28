"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthProfileState, ProfileRow } from "@/lib/map/types";
import type { Database } from "@/lib/db/database.types";

export function EmployeeInvitePanel({
  auth,
  profiles,
}: {
  auth: AuthProfileState;
  profiles: ProfileRow[];
}) {
  const [email, setEmail] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [role, setRole] =
    useState<Database["public"]["Enums"]["user_role"]>("employee");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Array<{ email: string; role: string }>>(
    [],
  );

  async function createProfile() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !auth.organization || !auth.profile) {
      setMessage("Cloud Mode is not ready.");
      return;
    }
    if (!email || !authUserId) {
      setMessage("Enter the employee email and their Supabase Auth user ID.");
      return;
    }

    const profileInsert: Database["public"]["Tables"]["profiles"]["Insert"] = {
      id: authUserId,
      organization_id: auth.organization.id,
      email,
      full_name: email.split("@")[0] ?? "Employee",
      role,
      active: true,
      created_by: auth.profile.id,
      updated_by: auth.profile.id,
    };

    const { error } = await supabase.from("profiles").insert(profileInsert as never);
    if (error) {
      setMessage(error.message);
      setPending((current) => [...current, { email, role }]);
      return;
    }

    setMessage("Profile created. The employee can now log in.");
    setEmail("");
    setAuthUserId("");
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="rounded-3xl bg-zinc-100 p-4">
        <h2 className="text-base font-black">Manual invite flow</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-semibold text-zinc-700">
          <li>Employee creates an account on the Login page with email/password.</li>
          <li>Owner or manager copies the employee Supabase Auth user ID.</li>
          <li>Create the profile here with the same email, role, and organization.</li>
          <li>Employee logs in again and Cloud Mode becomes available.</li>
        </ol>
      </div>

      <div className="grid gap-2 rounded-3xl bg-zinc-100 p-4">
        <label>
          <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
            Employee email
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold outline-none focus:border-zinc-950"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
            Supabase Auth user ID
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold outline-none focus:border-zinc-950"
            value={authUserId}
            onChange={(event) => setAuthUserId(event.target.value)}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
            Role
          </span>
          <select
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold outline-none focus:border-zinc-950"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as Database["public"]["Enums"]["user_role"])
            }
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button
          className="mt-1 h-12 rounded-2xl bg-zinc-950 text-sm font-black text-white"
          type="button"
          onClick={createProfile}
        >
          Create Profile
        </button>
        {message ? (
          <p className="rounded-2xl bg-white p-3 text-sm font-bold text-zinc-700">
            {message}
          </p>
        ) : null}
      </div>

      <section>
        <h2 className="mb-2 text-base font-black">Active users</h2>
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              className="flex items-center justify-between rounded-2xl bg-zinc-100 p-3"
              key={profile.id}
            >
              <div>
                <p className="text-sm font-black">{profile.full_name}</p>
                <p className="text-xs font-semibold text-zinc-600">
                  {profile.email}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black">
                {profile.active ? profile.role : "pending"}
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

      {pending.length ? (
        <section>
          <h2 className="mb-2 text-base font-black">Pending manual invites</h2>
          {pending.map((invite) => (
            <p
              className="mb-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-950"
              key={`${invite.email}-${invite.role}`}
            >
              {invite.email} · {invite.role}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
