import type { ReactNode } from "react";
import { Activity, BarChart3, Map, Menu, Search } from "lucide-react";
import Link from "next/link";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { PwaSupportWarning } from "@/components/pwa/pwa-support-warning";
import { LogoutButton } from "@/components/auth/logout-button";
import type { AuthProfileState } from "@/lib/map/types";

const navItems = [
  { label: "Map", icon: Map, href: "/" },
  { label: "Leads", icon: Activity, href: "/" },
  { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
  { label: "More", icon: Menu, href: "/settings" },
];

export function AppShell({
  auth,
  children,
}: {
  auth: AuthProfileState;
  children: ReactNode;
}) {
  const effectiveRole = auth.profile?.role ?? "owner";
  const visibleNavItems = navItems.filter((item) => {
    if (item.label !== "Dashboard") return true;
    return effectiveRole === "owner" || effectiveRole === "manager";
  });

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-background text-foreground">
      <ServiceWorkerRegister />
      <PwaSupportWarning />
      <main className="relative flex min-h-dvh w-full flex-col">
        {children}

        <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2">
            <button
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/80 bg-white/95 text-zinc-950 shadow-lg shadow-zinc-950/10 backdrop-blur"
              type="button"
              aria-label="Open menu"
            >
              <Menu size={21} strokeWidth={2.4} />
            </button>
            <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-white/80 bg-white/95 px-4 text-zinc-950 shadow-lg shadow-zinc-950/10 backdrop-blur">
              <Search className="shrink-0 text-zinc-500" size={19} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-5">
                  Search Ottawa territory
                </p>
                <p className="truncate text-xs leading-4 text-zinc-500">
                  Customers, streets, employees, notes
                </p>
              </div>
            </div>
            <div className="flex h-12 shrink-0 items-center rounded-full border border-white/80 bg-white/95 text-xs font-black text-zinc-950 shadow-lg shadow-zinc-950/10 backdrop-blur">
              {auth.userId ? (
                <LogoutButton />
              ) : (
                <Link
                  className="flex h-12 min-w-12 items-center justify-center px-3"
                  href="/login"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </header>

        <nav className="absolute inset-x-0 bottom-0 z-[1100] border-t border-zinc-200/80 bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(24,24,27,0.08)] backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  href={item.href}
                  className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold ${
                    item.label === "Map"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-500 active:bg-zinc-100"
                  }`}
                  key={item.label}
                >
                  <Icon size={20} strokeWidth={2.25} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
