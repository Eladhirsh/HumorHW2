import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface PipelineStep {
  id: number;
  order_by: number;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  llm_model_id: number | null;
  llm_temperature: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  humor_flavor_step_type_id: number | null;
}

interface LLMModel {
  id: number;
  name: string;
  provider_model_id: string;
  llm_provider_id: number;
  is_temperature_supported: boolean;
}

async function callGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string | null,
  imageMime: string | null,
  temperature: number | null,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const parts: Record<string, unknown>[] = [];
  if (imageBase64 && imageMime) {
    parts.push({ inline_data: { mime_type: imageMime, data: imageBase64 } });
  }
  parts.push({ text: userPrompt });

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts }],
  };
  if (temperature != null) {
    body.generationConfig = { temperature };
  }

  const geminiModel = mapToGeminiModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

function mapToGeminiModel(providerModelId: string): string {
  // Map stored provider model IDs to actual Gemini API model names
  const mapping: Record<string, string> = {
    "gemini-2.5-flash": "gemini-2.0-flash",
    "gemini-2.5-flash-lite": "gemini-2.0-flash-lite",
    "gemini-2.5-pro": "gemini-2.0-flash",
    "gemini-1.5-flash": "gemini-1.5-flash",
    "gemini-1.5-pro": "gemini-1.5-pro",
  };
  return mapping[providerModelId] || "gemini-2.0-flash";
}

function interpolatePrompt(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`\${${key}}`, value);
  }
  return result;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_superadmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { flavorId, imageBase64, imageMime, imageAdditionalContext } =
    await req.json();

  if (!flavorId) {
    return NextResponse.json(
      { error: "flavorId is required" },
      { status: 400 },
    );
  }

  // Load steps for this flavor
  const { data: steps, error: stepsError } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: true });

  if (stepsError || !steps?.length) {
    return NextResponse.json(
      { error: "No steps found for this flavor" },
      { status: 404 },
    );
  }

  // Load models
  const { data: models } = await supabase
    .from("llm_models")
    .select("id, name, provider_model_id, llm_provider_id, is_temperature_supported");

  const modelMap = new Map<number, LLMModel>();
  models?.forEach((m) => modelMap.set(m.id, m as LLMModel));

  // Run pipeline
  const results: {
    stepId: number;
    order: number;
    status: "success" | "error";
    output: string;
    model: string;
    durationMs: number;
  }[] = [];

  const stepOutputs: Record<string, string> = {};
  stepOutputs["imageAdditionalContext"] = imageAdditionalContext || "";

  for (const step of steps as PipelineStep[]) {
    const model = step.llm_model_id ? modelMap.get(step.llm_model_id) : null;
    const providerModelId = model?.provider_model_id || "gemini-2.0-flash";
    const modelName = model?.name || "Unknown";

    // Build prompt with variable interpolation
    const systemPrompt = interpolatePrompt(
      step.llm_system_prompt || "",
      stepOutputs,
    );
    const userPrompt = interpolatePrompt(
      step.llm_user_prompt || "",
      stepOutputs,
    );

    // Determine if this step needs the image (input type 1 = image-and-text)
    const needsImage = step.llm_input_type_id === 1;
    const temp =
      model?.is_temperature_supported === false
        ? null
        : step.llm_temperature;

    const startTime = Date.now();
    try {
      const output = await callGemini(
        providerModelId,
        systemPrompt,
        userPrompt,
        needsImage ? imageBase64 : null,
        needsImage ? imageMime : null,
        temp,
      );

      const durationMs = Date.now() - startTime;
      results.push({
        stepId: step.id,
        order: step.order_by ?? 0,
        status: "success",
        output,
        model: modelName,
        durationMs,
      });

      // Store output for next step interpolation
      stepOutputs[`step${step.order_by}Output`] = output;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        stepId: step.id,
        order: step.order_by ?? 0,
        status: "error",
        output: message,
        model: modelName,
        durationMs,
      });
      // Stop pipeline on error
      break;
    }
  }

  return NextResponse.json({ results });
}
