import Link from "next/link";

import { EmployeeInvitePanel } from "@/components/admin/employee-invite-panel";
import { loadAuthProfile } from "@/lib/auth/profile";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/map/types";

export default async function EmployeesPage() {
  const auth = await loadAuthProfile();

  if (!auth.isConfigured) {
    return <AdminGuard message="Supabase is not configured. Demo Mode is available." />;
  }

  if (!auth.userId) {
    return (
      <AdminGuard
        action="Open Login"
        href="/login"
        message="Login is required before managing employees."
      />
    );
  }

  if (
    !auth.profile?.active ||
    !["owner", "manager"].includes(auth.profile.role)
  ) {
    return (
      <AdminGuard message="Owner or manager access is required for employee setup." />
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data } = auth.organization?.id
    ? await supabase!
        .from("profiles")
        .select("*")
        .eq("organization_id", auth.organization.id)
        .order("full_name")
    : { data: [] };

  return (
    <main className="min-h-dvh bg-[#d7e3dc] px-4 py-6 text-zinc-950">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-bold text-zinc-600" href="/">
          Back to map
        </Link>
        <div className="mt-4 rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-2xl shadow-zinc-950/15 backdrop-blur">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Employee setup
          </p>
          <h1 className="mt-1 text-2xl font-black">Invite employees</h1>
          <EmployeeInvitePanel
            auth={auth}
            profiles={(data ?? []) as ProfileRow[]}
          />
        </div>
      </div>
    </main>
  );
}

function AdminGuard({
  action,
  href,
  message,
}: {
  action?: string;
  href?: string;
  message: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#d7e3dc] px-4 text-zinc-950">
      <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-5 text-center shadow-2xl shadow-zinc-950/15 backdrop-blur">
        <p className="text-sm font-black">{message}</p>
        {href && action ? (
          <Link
            className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white"
            href={href}
          >
            {action}
          </Link>
        ) : null}
        <Link className="mt-4 block text-sm font-bold text-zinc-600" href="/">
          Return to map
        </Link>
      </div>
    </main>
  );
}
