import { HomeMap } from "@/components/map/home-map";
import { AppShell } from "@/components/layout/app-shell";
import { loadAuthProfile } from "@/lib/auth/profile";

export default async function Home() {
  const auth = await loadAuthProfile();

  return (
    <AppShell auth={auth}>
      <HomeMap auth={auth} />
    </AppShell>
  );
}
