import Link from "next/link";

import { CloudTestPanel } from "@/components/admin/cloud-test-panel";
import { loadAuthProfile } from "@/lib/auth/profile";

export default async function CloudTestPage() {
  const auth = await loadAuthProfile();

  if (!auth.isConfigured) {
    return <AdminGuard message="Supabase is not configured. Demo Mode is available." />;
  }

  if (!auth.userId) {
    return (
      <AdminGuard
        action="Open Login"
        href="/login"
        message="Login is required before running the cloud smoke test."
      />
    );
  }

  if (!auth.profile?.active || auth.profile.role !== "owner") {
    return <AdminGuard message="Owner access is required for /admin/cloud-test." />;
  }

  if (!auth.organization) {
    return <AdminGuard message="No organization is linked to this owner profile." />;
  }

  return (
    <main className="min-h-dvh bg-[#d7e3dc] px-4 py-6 text-zinc-950">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-bold text-zinc-600" href="/">
          Back to map
        </Link>
        <div className="mt-4 rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-2xl shadow-zinc-950/15 backdrop-blur">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Owner tools
          </p>
          <h1 className="mt-1 text-2xl font-black">Cloud smoke test</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600">
            Runs RLS-safe checks with the current signed-in owner session.
          </p>
          <CloudTestPanel auth={auth} />
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
