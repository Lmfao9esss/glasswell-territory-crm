import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/db/database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  browserClient ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
