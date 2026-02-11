import { createClient } from "@/lib/supabase/server";
import CaptionsTable from "@/components/CaptionsTable";

export default async function CaptionsPage() {
  const supabase = await createClient();

  const { data: captions, error } = await supabase
    .from("captions")
    .select("id, created_datetime_utc, content, is_public, profile_id, image_id, is_featured, like_count, humor_flavor_id")
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Captions</h2>
        <p className="text-gray-400 text-sm mt-1">
          Browse and manage user-generated captions
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          Error loading captions: {error.message}
        </div>
      )}

      <CaptionsTable captions={captions || []} />
    </div>
  );
}
