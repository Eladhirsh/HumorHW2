"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface Step {
  id: number;
  created_datetime_utc: string | null;
  humor_flavor_id: number;
  llm_temperature: number | null;
  order_by: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  llm_model_id: number | null;
  humor_flavor_step_type_id: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
}

interface LookupItem {
  id: number;
  name?: string;
  slug?: string;
  description?: string;
}

interface StepsTableProps {
  steps: Step[];
  flavorId: number;
  flavorSlug: string;
  models: LookupItem[];
  stepTypes: LookupItem[];
  inputTypes: LookupItem[];
  outputTypes: LookupItem[];
}

type EditableStep = Omit<Step, "id" | "created_datetime_utc">;

const EMPTY_STEP: EditableStep = {
  humor_flavor_id: 0,
  llm_temperature: null,
  order_by: null,
  llm_input_type_id: null,
  llm_output_type_id: null,
  llm_model_id: null,
  humor_flavor_step_type_id: null,
  llm_system_prompt: "",
  llm_user_prompt: "",
  description: null,
};

export default function StepsTable({
  steps,
  flavorId,
  flavorSlug,
  models,
  stepTypes,
  inputTypes,
  outputTypes,
}: StepsTableProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<EditableStep>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState<EditableStep>({ ...EMPTY_STEP, humor_flavor_id: flavorId });

  const sorted = [...steps].sort((a, b) => (a.order_by ?? 999) - (b.order_by ?? 999));

  const lookupName = (items: LookupItem[], id: number | null) => {
    if (id == null) return "—";
    const item = items.find((i) => i.id === id);
    return item?.name || item?.slug || item?.description || String(id);
  };

  const startEdit = (step: Step) => {
    setEditing(step.id);
    setEditData({
      llm_temperature: step.llm_temperature,
      order_by: step.order_by,
      llm_input_type_id: step.llm_input_type_id,
      llm_output_type_id: step.llm_output_type_id,
      llm_model_id: step.llm_model_id,
      humor_flavor_step_type_id: step.humor_flavor_step_type_id,
      llm_system_prompt: step.llm_system_prompt,
      llm_user_prompt: step.llm_user_prompt,
      description: step.description,
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("humor_flavor_steps")
      .update({
        llm_temperature: editData.llm_temperature,
        order_by: editData.order_by,
        llm_input_type_id: editData.llm_input_type_id,
        llm_output_type_id: editData.llm_output_type_id,
        llm_model_id: editData.llm_model_id,
        humor_flavor_step_type_id: editData.humor_flavor_step_type_id,
        llm_system_prompt: editData.llm_system_prompt,
        llm_user_prompt: editData.llm_user_prompt,
        description: editData.description,
      })
      .eq("id", editing);
    setSaving(false);
    if (error) {
      alert("Failed to save: " + error.message);
    } else {
      setEditing(null);
      router.refresh();
    }
  };

  const deleteStep = async (id: number) => {
    if (!confirm("Are you sure you want to delete this step?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("humor_flavor_steps").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      router.refresh();
    }
  };

  const addStep = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("humor_flavor_steps").insert({
      humor_flavor_id: flavorId,
      llm_temperature: newData.llm_temperature,
      order_by: newData.order_by,
      llm_input_type_id: newData.llm_input_type_id,
      llm_output_type_id: newData.llm_output_type_id,
      llm_model_id: newData.llm_model_id,
      humor_flavor_step_type_id: newData.humor_flavor_step_type_id,
      llm_system_prompt: newData.llm_system_prompt || null,
      llm_user_prompt: newData.llm_user_prompt || null,
      description: newData.description || null,
    });
    setSaving(false);
    if (error) {
      alert("Failed to add: " + error.message);
    } else {
      setAdding(false);
      setNewData({ ...EMPTY_STEP, humor_flavor_id: flavorId });
      router.refresh();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {steps.length} step{steps.length !== 1 ? "s" : ""} configured
        </p>
        <button
          onClick={() => { setAdding(true); setEditing(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Add Step
        </button>
      </div>

      {adding && (
        <StepForm
          data={newData}
          onChange={setNewData}
          onSave={addStep}
          onCancel={() => { setAdding(false); setNewData({ ...EMPTY_STEP, humor_flavor_id: flavorId }); }}
          saving={saving}
          models={models}
          stepTypes={stepTypes}
          inputTypes={inputTypes}
          outputTypes={outputTypes}
          title="New Step"
        />
      )}

      <div className="space-y-3">
        {sorted.map((step) => (
          <div key={step.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            {editing === step.id ? (
              <StepForm
                data={editData as EditableStep}
                onChange={(d) => setEditData(d)}
                onSave={save}
                onCancel={() => setEditing(null)}
                saving={saving}
                models={models}
                stepTypes={stepTypes}
                inputTypes={inputTypes}
                outputTypes={outputTypes}
                title={`Edit Step #${step.id}`}
              />
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 text-sm font-bold">
                        {step.order_by ?? "?"}
                      </span>
                      <span className="text-sm font-medium text-gray-200">
                        {lookupName(stepTypes, step.humor_flavor_step_type_id)}
                      </span>
                      <span className="text-xs text-gray-600">ID: {step.id}</span>
                    </div>
                    {step.description && (
                      <p className="text-sm text-gray-400 mb-2">{step.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Model: <span className="text-gray-300">{lookupName(models, step.llm_model_id)}</span></span>
                      <span>Input: <span className="text-gray-300">{lookupName(inputTypes, step.llm_input_type_id)}</span></span>
                      <span>Output: <span className="text-gray-300">{lookupName(outputTypes, step.llm_output_type_id)}</span></span>
                      {step.llm_temperature != null && (
                        <span>Temp: <span className="text-gray-300">{step.llm_temperature}</span></span>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      <PromptPreview label="System Prompt" value={step.llm_system_prompt} />
                      <PromptPreview label="User Prompt" value={step.llm_user_prompt} />
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(step)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {steps.length === 0 && !adding && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-500 text-sm">
            No steps configured for this flavor. Click &quot;+ Add Step&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
}

function PromptPreview({ label, value }: { label: string; value: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return null;
  const truncated = value.length > 120;
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-medium text-gray-500 hover:text-gray-300 flex items-center gap-1"
      >
        {label} <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? (
        <pre className="mt-1 text-xs text-gray-400 bg-gray-800/50 rounded p-2 max-h-60 overflow-auto whitespace-pre-wrap break-words">
          {value}
        </pre>
      ) : truncated ? (
        <p className="mt-1 text-xs text-gray-500 truncate">{value.slice(0, 120)}...</p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">{value}</p>
      )}
    </div>
  );
}

function StepForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
  models,
  stepTypes,
  inputTypes,
  outputTypes,
  title,
}: {
  data: EditableStep;
  onChange: (d: EditableStep) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  models: LookupItem[];
  stepTypes: LookupItem[];
  inputTypes: LookupItem[];
  outputTypes: LookupItem[];
  title: string;
}) {
  return (
    <div className="bg-gray-900 border border-indigo-800 rounded-lg p-4 mb-3 space-y-4">
      <h4 className="text-sm font-medium text-indigo-400">{title}</h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Order</label>
          <input
            type="number"
            value={data.order_by ?? ""}
            onChange={(e) => onChange({ ...data, order_by: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
            placeholder="1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Step Type</label>
          <select
            value={data.humor_flavor_step_type_id ?? ""}
            onChange={(e) => onChange({ ...data, humor_flavor_step_type_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          >
            <option value="">Select...</option>
            {stepTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.slug || t.description || t.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">LLM Model</label>
          <select
            value={data.llm_model_id ?? ""}
            onChange={(e) => onChange({ ...data, llm_model_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          >
            <option value="">Select...</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={data.llm_temperature ?? ""}
            onChange={(e) => onChange({ ...data, llm_temperature: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
            placeholder="0.7"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Input Type</label>
          <select
            value={data.llm_input_type_id ?? ""}
            onChange={(e) => onChange({ ...data, llm_input_type_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          >
            <option value="">Select...</option>
            {inputTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.description || t.slug || t.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Output Type</label>
          <select
            value={data.llm_output_type_id ?? ""}
            onChange={(e) => onChange({ ...data, llm_output_type_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          >
            <option value="">Select...</option>
            {outputTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.description || t.slug || t.id}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <input
          type="text"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200"
          placeholder="Optional description for this step"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">System Prompt</label>
        <textarea
          value={data.llm_system_prompt || ""}
          onChange={(e) => onChange({ ...data, llm_system_prompt: e.target.value })}
          rows={6}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 font-mono"
          placeholder="System prompt..."
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">User Prompt</label>
        <textarea
          value={data.llm_user_prompt || ""}
          onChange={(e) => onChange({ ...data, llm_user_prompt: e.target.value })}
          rows={6}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 font-mono"
          placeholder="User prompt..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
