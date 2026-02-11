import { createClient } from "@/lib/supabase/server";
import UsersTable from "@/components/UsersTable";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, created_datetime_utc, first_name, last_name, email, is_superadmin, is_in_study, is_matrix_admin")
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Users & Profiles</h2>
        <p className="text-gray-400 text-sm mt-1">
          Manage user profiles and permissions
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          Error loading profiles: {error.message}
        </div>
      )}

      <UsersTable profiles={profiles || []} />
    </div>
  );
}
