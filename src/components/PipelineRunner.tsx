"use client";

import { useState, useRef, useCallback } from "react";

interface StepInfo {
  id: number;
  order: number;
  type: string;
  model: string;
  description: string | null;
}

interface StepResult {
  stepId: number;
  order: number;
  status: "success" | "error";
  output: string;
  model: string;
  durationMs: number;
}

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
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageMime(file.type);
    setImagePreview(URL.createObjectURL(file));
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
    setResults([]);
    setError(null);
    setCurrentStep(1);

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
      setResults(data.results);
      setCurrentStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCurrentStep(0);
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMime(null);
    setAdditionalContext("");
    setResults([]);
    setError(null);
    setCurrentStep(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Pipeline overview */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Pipeline Steps</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {stepsInfo.map((step, i) => {
            const result = results.find((r) => r.stepId === step.id);
            const isRunning = running && currentStep > 0 && !result &&
              (results.length === i);
            let borderColor = "border-gray-700";
            let bgColor = "bg-gray-800/50";
            if (result?.status === "success") {
              borderColor = "border-emerald-700";
              bgColor = "bg-emerald-900/20";
            } else if (result?.status === "error") {
              borderColor = "border-red-700";
              bgColor = "bg-red-900/20";
            } else if (isRunning) {
              borderColor = "border-indigo-600";
              bgColor = "bg-indigo-900/20";
            }
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`${bgColor} ${borderColor} border rounded-lg px-3 py-2 min-w-[140px] transition-colors`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                      {step.order}
                    </span>
                    <span className="text-xs font-medium text-gray-300">{step.type}</span>
                    {isRunning && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                    {result?.status === "success" && (
                      <span className="text-emerald-400 text-xs">&#10003;</span>
                    )}
                    {result?.status === "error" && (
                      <span className="text-red-400 text-xs">&#10007;</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">{step.model}</p>
                  {result && (
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {(result.durationMs / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
                {i < stepsInfo.length - 1 && (
                  <span className="text-gray-600 text-lg shrink-0">&#8594;</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
              accept="image/*"
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

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Results</h3>
          {results.map((result) => {
            const stepInfo = stepsInfo.find((s) => s.id === result.stepId);
            return (
              <StepResultCard
                key={result.stepId}
                result={result}
                stepInfo={stepInfo}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepResultCard({
  result,
  stepInfo,
}: {
  result: StepResult;
  stepInfo?: StepInfo;
}) {
  const [expanded, setExpanded] = useState(true);
  const isError = result.status === "error";

  // Try to parse as JSON array for caption display
  let captions: string[] | null = null;
  if (!isError) {
    try {
      // Strip markdown code fences if present
      let cleaned = result.output.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "");
      }
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.every((i) => typeof i === "string")) {
        captions = parsed;
      }
    } catch {
      // Not a JSON array, show as text
    }
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isError
          ? "border-red-800 bg-red-900/10"
          : "border-gray-800 bg-gray-900"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
              isError
                ? "bg-red-900/50 text-red-400"
                : "bg-emerald-900/50 text-emerald-400"
            }`}
          >
            {result.order}
          </span>
          <div className="text-left">
            <span className="text-sm font-medium text-gray-200">
              {stepInfo?.type || `Step ${result.order}`}
            </span>
            {stepInfo?.description && (
              <span className="text-xs text-gray-500 ml-2">
                {stepInfo.description}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {result.model} &middot; {(result.durationMs / 1000).toFixed(1)}s
          </span>
          <span className="text-gray-600 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800">
          {captions ? (
            <div className="mt-3 space-y-2">
              {captions.map((caption, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg"
                >
                  <span className="text-xs font-bold text-gray-500 w-5 shrink-0 pt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-200">{caption}</p>
                </div>
              ))}
            </div>
          ) : (
            <pre
              className={`mt-3 text-xs rounded-lg p-3 max-h-80 overflow-auto whitespace-pre-wrap break-words ${
                isError
                  ? "bg-red-900/20 text-red-300"
                  : "bg-gray-800/50 text-gray-300"
              }`}
            >
              {result.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
