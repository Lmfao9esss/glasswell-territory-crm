import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { loadAuthProfile } from "@/lib/auth/profile";

export default async function SettingsPage() {
  const auth = await loadAuthProfile();

  return (
    <AppShell auth={auth}>
      <div className="min-h-dvh overflow-y-auto bg-[#d7e3dc] px-4 pb-28 pt-24 text-zinc-950">
        <div className="mx-auto max-w-xl">
          <Link className="text-sm font-bold text-zinc-600" href="/">
            Back to map
          </Link>
          <div className="mt-4">
            <SettingsPanel auth={auth} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
