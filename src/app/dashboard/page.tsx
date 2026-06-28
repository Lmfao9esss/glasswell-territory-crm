import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { OwnerCommandCenter } from "@/components/dashboard/owner-command-center";
import { loadAuthProfile } from "@/lib/auth/profile";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demoRole?: string }>;
}) {
  const auth = await loadAuthProfile();
  const params = await searchParams;
  const effectiveRole = auth.profile?.role ?? params.demoRole ?? "owner";
  const blocked =
    auth.profile?.active === false ||
    (effectiveRole !== "owner" && effectiveRole !== "manager");

  if (blocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#d7e3dc] px-4 text-zinc-950">
        <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-5 text-center shadow-2xl shadow-zinc-950/15 backdrop-blur">
          <p className="text-sm font-black">
            Owner or manager access is required for the dashboard.
          </p>
          <Link className="mt-4 block text-sm font-bold text-zinc-600" href="/">
            Return to map
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AppShell auth={auth}>
      <OwnerCommandCenter auth={auth} />
    </AppShell>
  );
}
