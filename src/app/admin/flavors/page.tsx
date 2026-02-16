import { createClient } from "@/lib/supabase/server";
import FlavorsTable from "@/components/FlavorsTable";

export default async function FlavorsPage() {
  const supabase = await createClient();

  const { data: flavors, error } = await supabase
    .from("humor_flavors")
    .select("id, created_datetime_utc, description, slug")
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Humor Flavors</h2>
        <p className="text-gray-400 text-sm mt-1">
          Manage humor flavor profiles
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          Error loading flavors: {error.message}
        </div>
      )}

      <FlavorsTable flavors={flavors || []} />
    </div>
  );
}
