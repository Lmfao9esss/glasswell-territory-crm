import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { FeedbackPanel } from "@/components/feedback/feedback-panel";
import { loadAuthProfile } from "@/lib/auth/profile";

export default async function FeedbackPage() {
  const auth = await loadAuthProfile();

  return (
    <AppShell auth={auth}>
      <div className="min-h-dvh overflow-y-auto bg-[#d7e3dc] px-4 pb-28 pt-24 text-zinc-950">
        <div className="mx-auto max-w-xl">
          <Link className="text-sm font-bold text-zinc-600" href="/">
            Back to map
          </Link>
          <div className="mt-4">
            <FeedbackPanel auth={auth} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
