"use client";

import { useEffect, useState } from "react";

export function PwaSupportWarning() {
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setUnsupported(!("serviceWorker" in navigator));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!unsupported) return null;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-[4.25rem] z-[1400] mx-auto max-w-md rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 shadow-xl shadow-zinc-950/15">
      Offline install support is limited in this browser. Demo Mode still works.
    </div>
  );
}
