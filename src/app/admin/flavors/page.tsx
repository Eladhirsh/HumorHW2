import { createClient } from "@/lib/supabase/server";
import FlavorsTable from "@/components/FlavorsTable";

export default async function FlavorsPage() {
  const supabase = await createClient();

  const { data: flavors, error } = await supabase
    .from("humor_flavors")
    .select("id, created_datetime_utc, description, slug")
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  // Get step counts per flavor
  const { data: steps } = await supabase
    .from("humor_flavor_steps")
    .select("humor_flavor_id");

  const stepCounts: Record<number, number> = {};
  steps?.forEach((s) => {
    stepCounts[s.humor_flavor_id] = (stepCounts[s.humor_flavor_id] || 0) + 1;
  });

  const flavorsWithCounts = (flavors || []).map((f) => ({
    ...f,
    step_count: stepCounts[f.id] || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Humor Flavors</h2>
        <p className="text-gray-400 text-sm mt-1">
          Manage humor flavor profiles and their LLM pipeline steps
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          Error loading flavors: {error.message}
        </div>
      )}

      <FlavorsTable flavors={flavorsWithCounts} />
    </div>
  );
}
