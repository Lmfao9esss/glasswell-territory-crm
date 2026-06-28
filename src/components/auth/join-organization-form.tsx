"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";

type JoinResult = {
  organization_id: string;
  profile_id: string;
  role: "employee" | "manager" | "owner";
};

export function JoinOrganizationForm({
  initialCode,
}: {
  initialCode: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submitJoin() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase is not configured. Ask an owner for help.");
      return;
    }
    if (!email.trim() || !password || !fullName.trim() || !inviteCode.trim()) {
      setMessage("Enter your email, password, full name, and invite code.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    try {
      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user.email && session.user.email !== email.trim()) {
        await supabase.auth.signOut();
        session = null;
      }

      if (!session) {
        const signUpResult = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim() || null,
            },
          },
        });

        if (signUpResult.error) {
          const existingAccount =
            signUpResult.error.message.toLowerCase().includes("registered") ||
            signUpResult.error.message.toLowerCase().includes("already");

          if (!existingAccount) {
            throw signUpResult.error;
          }

          const signInResult = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInResult.error) {
            setMessage(
              "This email already has an account. Log in with the existing password, then open the invite link again.",
            );
            setIsPending(false);
            return;
          }
          session = signInResult.data.session;
        } else {
          session = signUpResult.data.session;
        }
      }

      if (!session) {
        setMessage(
          "Account created. Check your email to confirm it, then log in and open this invite link again.",
        );
        setIsPending(false);
        return;
      }

      const { data, error } = await supabase.rpc(
        "join_organization_by_invite" as never,
        {
          invite_code_input: inviteCode.trim(),
          employee_full_name: fullName.trim(),
          employee_phone: phone.trim() || null,
        } as never,
      );

      if (error) {
        throw error;
      }

      const joined = Array.isArray(data) ? (data[0] as JoinResult | undefined) : null;
      if (!joined) {
        throw new Error("Join request did not return a profile.");
      }
      if (joined.role !== "employee") {
        throw new Error("Invite links can only create employee profiles.");
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(formatSupabaseError(error));
      setIsPending(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
          Email
        </span>
        <input
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
          Password
        </span>
        <input
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
          Full name
        </span>
        <input
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
          Phone
        </span>
        <input
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
          Invite code
        </span>
        <input
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-black uppercase tracking-[0.1em] outline-none focus:border-zinc-950"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />
      </label>
      {message ? (
        <p className="rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-700">
          {message}
        </p>
      ) : null}
      <button
        className="h-14 w-full rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white disabled:opacity-50"
        type="button"
        disabled={isPending}
        onClick={submitJoin}
      >
        {isPending ? "Joining" : "Join organization"}
      </button>
    </div>
  );
}
