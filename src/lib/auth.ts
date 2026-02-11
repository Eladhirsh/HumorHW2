import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the current user is authenticated and has is_superadmin == true.
 * Redirects to the login page if either check fails.
 * Returns the profile row for the authenticated superadmin.
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_superadmin !== true) {
    redirect("/auth/login?error=unauthorized");
  }

  return profile;
}
