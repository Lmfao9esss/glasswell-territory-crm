"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  async function logout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={logout}>
      Logout
    </button>
  );
}
