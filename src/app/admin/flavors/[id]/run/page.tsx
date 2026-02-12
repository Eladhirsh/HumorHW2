import { createClient } from "@/lib/supabase/server";
import PipelineRunner from "@/components/PipelineRunner";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flavorId = Number(id);
  if (isNaN(flavorId)) notFound();

  const supabase = await createClient();

  const { data: flavor } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .eq("id", flavorId)
    .single();

  if (!flavor) notFound();

  const { data: steps } = await supabase
    .from("humor_flavor_steps")
    .select("id, order_by, humor_flavor_step_type_id, llm_model_id, description")
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: true });

  const { data: models } = await supabase
    .from("llm_models")
    .select("id, name");

  const { data: stepTypes } = await supabase
    .from("humor_flavor_step_types")
    .select("id, slug");

  const modelMap: Record<number, string> = {};
  models?.forEach((m) => (modelMap[m.id] = m.name));
  const typeMap: Record<number, string> = {};
  stepTypes?.forEach((t) => (typeMap[t.id] = t.slug));

  const stepsInfo = (steps || []).map((s) => ({
    id: s.id,
    order: s.order_by,
    type: typeMap[s.humor_flavor_step_type_id ?? 0] || "unknown",
    model: modelMap[s.llm_model_id ?? 0] || "unknown",
    description: s.description,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/flavors/${flavorId}/steps`}
          className="text-sm text-indigo-400 hover:text-indigo-300 mb-2 inline-block"
        >
          &larr; Back to Steps
        </Link>
        <h2 className="text-2xl font-bold text-white">
          Run &ldquo;{flavor.slug}&rdquo;
        </h2>
        {flavor.description && (
          <p className="text-gray-400 text-sm mt-1">{flavor.description}</p>
        )}
      </div>

      <PipelineRunner flavorId={flavorId} stepsInfo={stepsInfo} />
    </div>
  );
}
