"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const supabase = getSupabaseBrowserClient();

  async function signIn() {
    if (!supabase) {
      setMessage("Supabase is not configured. Demo Mode is available.");
      return;
    }
    setIsPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.href = "/";
  }

  async function signUp() {
    if (!supabase) {
      setMessage("Supabase is not configured. Demo Mode is available.");
      return;
    }
    setIsPending(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setIsPending(false);
    setMessage(error ? error.message : "Account created. Check your email if confirmation is enabled.");
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
      {message ? (
        <p className="rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-700">
          {message}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="h-14 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white disabled:opacity-50"
          type="button"
          disabled={isPending || !email || !password}
          onClick={signIn}
        >
          Login
        </button>
        <button
          className="h-14 rounded-2xl bg-zinc-100 px-4 text-sm font-black text-zinc-950 disabled:opacity-50"
          type="button"
          disabled={isPending || !email || !password}
          onClick={signUp}
        >
          Create
        </button>
      </div>
    </div>
  );
}
