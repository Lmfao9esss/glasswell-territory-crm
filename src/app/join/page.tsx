import Link from "next/link";

import { JoinOrganizationForm } from "@/components/auth/join-organization-form";
import { loadAuthProfile } from "@/lib/auth/profile";

export default async function JoinPage() {
  const auth = await loadAuthProfile();

  return (
    <main className="grid min-h-dvh place-items-center bg-[#d7e3dc] px-4 py-8 text-zinc-950">
      <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-2xl shadow-zinc-950/20 backdrop-blur">
        <p className="text-xs font-bold uppercase text-zinc-500">
          Glasswell Territory CRM
        </p>
        <h1 className="mt-1 text-2xl font-black">Join organization</h1>
        {!auth.isConfigured ? (
          <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-sm font-bold text-amber-950">
            Supabase is not configured. Ask an owner for help.
          </div>
        ) : (
          <JoinOrganizationForm initialCode="" />
        )}
        <div className="mt-4 flex items-center justify-center gap-4 text-sm font-bold text-zinc-600">
          <Link href="/login">Log in</Link>
          <Link href="/">Return to map</Link>
        </div>
      </div>
    </main>
  );
}
