import type { AuthProfileState } from "@/lib/map/types";
import type { Database } from "@/lib/db/database.types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function loadAuthProfile(): Promise<AuthProfileState> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return {
      isConfigured: false,
      userId: null,
      email: null,
      profile: null,
      organization: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isConfigured: true,
      userId: null,
      email: null,
      profile: null,
      organization: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const typedProfile =
    profile as Database["public"]["Tables"]["profiles"]["Row"] | null;

  const { data: organization } = typedProfile?.organization_id
    ? await supabase
        .from("organizations")
        .select("*")
        .eq("id", typedProfile.organization_id)
        .maybeSingle()
    : { data: null };
  const typedOrganization =
    organization as Database["public"]["Tables"]["organizations"]["Row"] | null;

  return {
    isConfigured: true,
    userId: user.id,
    email: user.email ?? null,
    profile: typedProfile ?? null,
    organization: typedOrganization ?? null,
  };
}
