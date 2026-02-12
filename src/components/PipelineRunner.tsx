"use client";

import { useState, useRef, useCallback } from "react";

interface StepInfo {
  id: number;
  order: number;
  type: string;
  model: string;
  description: string | null;
}

interface ApiStep {
  step: string;
  status: "success" | "error";
  detail: string;
  durationMs: number;
}

interface Caption {
  id?: string;
  content?: string;
  [key: string]: unknown;
}

const PIPELINE_STAGES = [
  { label: "Presigned URL", description: "Generate upload URL" },
  { label: "Upload", description: "Upload image to S3" },
  { label: "Register", description: "Register image in pipeline" },
  { label: "Generate", description: "Generate captions via LLM pipeline" },
];

export default function PipelineRunner({
  flavorId,
  stepsInfo,
}: {
  flavorId: number;
  stepsInfo: StepInfo[];
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [running, setRunning] = useState(false);
  const [apiSteps, setApiSteps] = useState<ApiStep[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;

    // Reject HEIC — the backend doesn't support it and browsers can't reliably convert it
    const lowerName = file.name.toLowerCase();
    if (file.type === "image/heic" || file.type === "image/heif" || lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) {
      setError("HEIC images are not supported. Please convert to JPEG or PNG first.");
      return;
    }

    setError(null);
    const supportedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
      ? file.type
      : "image/jpeg";

    setImagePreview(URL.createObjectURL(file));
    setImageMime(supportedMime);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const runPipeline = async () => {
    if (!imageBase64) {
      setError("Please upload an image first.");
      return;
    }
    setRunning(true);
    setApiSteps([]);
    setCaptions([]);
    setError(null);

    try {
      const resp = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flavorId,
          imageBase64,
          imageMime,
          imageAdditionalContext: additionalContext || "",
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setApiSteps(data.steps || []);
      setCaptions(data.captions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMime(null);
    setAdditionalContext("");
    setApiSteps([]);
    setCaptions([]);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* LLM Pipeline steps (from DB) */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">LLM Pipeline Steps</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {stepsInfo.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 min-w-[140px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                    {step.order}
                  </span>
                  <span className="text-xs font-medium text-gray-300">{step.type}</span>
                </div>
                <p className="text-[10px] text-gray-500">{step.model}</p>
              </div>
              {i < stepsInfo.length - 1 && (
                <span className="text-gray-600 text-lg shrink-0">&#8594;</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API pipeline progress */}
      {(running || apiSteps.length > 0) && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">API Pipeline Progress</h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const step = apiSteps[i];
              const isRunning = running && !step && apiSteps.length === i;
              let borderColor = "border-gray-700";
              let bgColor = "bg-gray-800/50";
              if (step?.status === "success") {
                borderColor = "border-emerald-700";
                bgColor = "bg-emerald-900/20";
              } else if (step?.status === "error") {
                borderColor = "border-red-700";
                bgColor = "bg-red-900/20";
              } else if (isRunning) {
                borderColor = "border-indigo-600";
                bgColor = "bg-indigo-900/20";
              }
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className={`${bgColor} ${borderColor} border rounded-lg px-3 py-2 min-w-[130px] transition-colors`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-gray-300">{stage.label}</span>
                      {isRunning && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
                      {step?.status === "success" && <span className="text-emerald-400 text-xs">&#10003;</span>}
                      {step?.status === "error" && <span className="text-red-400 text-xs">&#10007;</span>}
                    </div>
                    <p className="text-[10px] text-gray-500">{stage.description}</p>
                    {step && (
                      <p className="text-[10px] text-gray-600 mt-0.5">{(step.durationMs / 1000).toFixed(1)}s</p>
                    )}
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <span className="text-gray-600 text-lg shrink-0">&#8594;</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Image
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              imagePreview
                ? "border-indigo-700 bg-indigo-900/10"
                : "border-gray-700 hover:border-gray-600 bg-gray-800/30"
            }`}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Upload preview"
                className="max-h-64 mx-auto rounded-lg"
              />
            ) : (
              <div className="text-gray-500">
                <p className="text-lg mb-1">Drop an image here</p>
                <p className="text-xs">or click to browse</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Context <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
              placeholder="Any extra context about the image..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={runPipeline}
              disabled={running || !imageBase64}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium text-sm px-6 py-3 rounded-lg transition-colors"
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Pipeline...
                </span>
              ) : (
                "Run Pipeline"
              )}
            </button>
            <button
              onClick={reset}
              disabled={running}
              className="text-sm text-gray-400 hover:text-gray-200 px-4 py-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step details */}
      {apiSteps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400">Step Details</h3>
          {apiSteps.map((step, i) => (
            <div
              key={i}
              className={`border rounded-lg px-4 py-2 text-sm ${
                step.status === "error"
                  ? "border-red-800 bg-red-900/10 text-red-300"
                  : "border-gray-800 bg-gray-900 text-gray-400"
              }`}
            >
              <span className="font-medium text-gray-300">{step.step}:</span>{" "}
              <span className="font-mono text-xs break-all">{step.detail}</span>
              <span className="text-gray-600 ml-2">({(step.durationMs / 1000).toFixed(1)}s)</span>
            </div>
          ))}
        </div>
      )}

      {/* Captions */}
      {captions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Generated Captions ({captions.length})
          </h3>
          <div className="space-y-2">
            {captions.map((caption, i) => {
              const text =
                typeof caption === "string"
                  ? caption
                  : caption.content || JSON.stringify(caption);
              return (
                <div
                  key={caption.id || i}
                  className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  <span className="text-sm font-bold text-gray-500 w-6 shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-200">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
