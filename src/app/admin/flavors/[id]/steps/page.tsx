import { createClient } from "@/lib/supabase/server";
import StepsTable from "@/components/StepsTable";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function StepsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [
    { data: steps, error },
    { data: models },
    { data: stepTypes },
    { data: inputTypes },
    { data: outputTypes },
  ] = await Promise.all([
    supabase
      .from("humor_flavor_steps")
      .select("id, created_datetime_utc, humor_flavor_id, llm_temperature, order_by, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt, description")
      .eq("humor_flavor_id", flavorId)
      .order("order_by", { ascending: true }),
    supabase.from("llm_models").select("id, name").order("name"),
    supabase.from("humor_flavor_step_types").select("id, slug, description").order("id"),
    supabase.from("llm_input_types").select("id, slug, description").order("id"),
    supabase.from("llm_output_types").select("id, slug, description").order("id"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/flavors"
          className="text-sm text-indigo-400 hover:text-indigo-300 mb-2 inline-block"
        >
          &larr; Back to Flavors
        </Link>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Steps for &ldquo;{flavor.slug}&rdquo;
          </h2>
          <Link
            href={`/admin/flavors/${flavorId}/run`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Run Pipeline
          </Link>
        </div>
        {flavor.description && (
          <p className="text-gray-400 text-sm mt-1">{flavor.description}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          Error loading steps: {error.message}
        </div>
      )}

      <StepsTable
        steps={steps || []}
        flavorId={flavorId}
        flavorSlug={flavor.slug || ""}
        models={models || []}
        stepTypes={stepTypes || []}
        inputTypes={inputTypes || []}
        outputTypes={outputTypes || []}
      />
    </div>
  );
}
