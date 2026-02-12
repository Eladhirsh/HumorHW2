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

// Free vision-capable models to try in order
const FREE_VISION_MODELS = [
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-4b-it:free",
];

// Free text-only models to try in order
const FREE_TEXT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1-0528:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-4b:free",
  "google/gemma-3-27b-it:free",
];

function getModelCandidates(needsVision: boolean): string[] {
  return needsVision ? FREE_VISION_MODELS : FREE_TEXT_MODELS;
}

async function callOpenRouter(
  modelCandidates: string[],
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string | null,
  imageMime: string | null,
  temperature: number | null,
): Promise<{ text: string; usedModel: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  // Build messages in OpenAI-compatible format
  const messages: Record<string, unknown>[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (imageBase64 && imageMime) {
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${imageMime};base64,${imageBase64}` },
        },
        { type: "text", text: userPrompt },
      ],
    });
  } else {
    messages.push({ role: "user", content: userPrompt });
  }

  // Try each model candidate; fall back on 429 or 404
  let lastError = "";
  for (const model of modelCandidates) {
    const body: Record<string, unknown> = { model, messages };
    if (temperature != null) {
      body.temperature = temperature;
    }

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://humorhw2.vercel.app",
        "X-Title": "Humor Admin Pipeline",
      },
      body: JSON.stringify(body),
    });

    if (resp.ok) {
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? "";
      return { text, usedModel: model };
    }

    // On rate-limit or not-found, try next model
    if (resp.status === 429 || resp.status === 404) {
      lastError = await resp.text();
      continue;
    }

    // Other errors are fatal
    const errText = await resp.text();
    throw new Error(`OpenRouter API error (${resp.status}): ${errText}`);
  }

  throw new Error(`All free models rate-limited. Last error: ${lastError}`);
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
    const modelCandidates = getModelCandidates(needsImage);
    const temp =
      model?.is_temperature_supported === false
        ? null
        : step.llm_temperature;

    const startTime = Date.now();
    try {
      const { text: output, usedModel } = await callOpenRouter(
        modelCandidates,
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
        model: `${modelName} (${usedModel})`,
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
