import { createClient } from "@/lib/supabase/server";
import ImagesGrid from "@/components/ImagesGrid";

export default async function ImagesPage() {
  const supabase = await createClient();

  const { data: images, error } = await supabase
    .from("images")
    .select("id, created_datetime_utc, url, is_common_use, profile_id, additional_context, is_public, image_description")
    .order("created_datetime_utc", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Images</h2>
        <p className="text-gray-400 text-sm mt-1">
          Browse and manage uploaded images
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          Error loading images: {error.message}
        </div>
      )}

      <ImagesGrid images={images || []} />
    </div>
  );
}
