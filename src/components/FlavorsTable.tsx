"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Flavor {
  id: number;
  created_datetime_utc: string | null;
  description: string | null;
  slug: string | null;
  step_count: number;
}

export default function FlavorsTable({ flavors }: { flavors: Flavor[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Flavor>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState({ description: "", slug: "" });

  const filtered = flavors.filter((f) => {
    const q = search.toLowerCase();
    return (
      !search ||
      f.description?.toLowerCase().includes(q) ||
      f.slug?.toLowerCase().includes(q) ||
      String(f.id).includes(q)
    );
  });

  const startEdit = (flavor: Flavor) => {
    setEditing(flavor.id);
    setEditData({ description: flavor.description, slug: flavor.slug });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("humor_flavors")
      .update({ description: editData.description, slug: editData.slug })
      .eq("id", editing);
    setSaving(false);
    if (error) {
      alert("Failed to save: " + error.message);
    } else {
      setEditing(null);
      router.refresh();
    }
  };

  const deleteFlavor = async (id: number) => {
    if (!confirm("Are you sure you want to delete this flavor? Its steps will also be deleted.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("humor_flavors").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      router.refresh();
    }
  };

  const addFlavor = async () => {
    if (!newData.slug.trim()) {
      alert("Slug is required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("humor_flavors")
      .insert({ description: newData.description || null, slug: newData.slug });
    setSaving(false);
    if (error) {
      alert("Failed to add: " + error.message);
    } else {
      setAdding(false);
      setNewData({ description: "", slug: "" });
      router.refresh();
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by slug, description, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          onClick={() => { setAdding(true); setEditing(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Add Flavor
        </button>
      </div>

      {adding && (
        <div className="bg-gray-900 border border-indigo-800 rounded-lg p-4 mb-4 space-y-3">
          <h4 className="text-sm font-medium text-indigo-400">New Humor Flavor</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slug *</label>
              <input
                type="text"
                value={newData.slug}
                onChange={(e) => setNewData({ ...newData, slug: e.target.value })}
                placeholder="e.g. sarcastic-roast"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={newData.description}
                onChange={(e) => setNewData({ ...newData, description: e.target.value })}
                placeholder="A brief description..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addFlavor}
              disabled={saving}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setAdding(false); setNewData({ description: "", slug: "" }); }}
              className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Steps</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-gray-800/30">
                  {editing === f.id ? (
                    <>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{f.id}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                          value={editData.slug || ""}
                          onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                          value={editData.description || ""}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">{f.step_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{f.created_datetime_utc?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={save}
                          disabled={saving}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs text-gray-400 hover:text-gray-200"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{f.id}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-200 font-medium">{f.slug || "—"}</span>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="text-sm text-gray-400 truncate">{f.description || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/flavors/${f.id}/steps`}
                          className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          {f.step_count} <span className="text-xs">&#8594;</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {f.created_datetime_utc?.slice(0, 10) || "—"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Link
                          href={`/admin/flavors/${f.id}/steps`}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Steps
                        </Link>
                        <button
                          onClick={() => startEdit(f)}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteFlavor(f.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No flavors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Showing {filtered.length} of {flavors.length} flavors
      </p>
    </div>
  );
}
