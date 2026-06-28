"use client";

import dynamic from "next/dynamic";
import type { AuthProfileState } from "@/lib/map/types";

const OttawaMap = dynamic(
  () => import("@/components/map/ottawa-map").then((mod) => mod.OttawaMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-dvh place-items-center bg-[#d7e3dc] text-sm font-semibold text-zinc-700">
        Loading map
      </div>
    ),
  },
);

export function HomeMap({ auth }: { auth: AuthProfileState }) {
  return <OttawaMap auth={auth} />;
}
