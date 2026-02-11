"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface Caption {
  id: string;
  created_datetime_utc: string | null;
  content: string | null;
  is_public: boolean | null;
  profile_id: string | null;
  image_id: string | null;
  is_featured: boolean | null;
  like_count: number | null;
  humor_flavor_id: number | null;
}

export default function CaptionsTable({ captions }: { captions: Caption[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterFeatured, setFilterFeatured] = useState<"all" | "featured" | "normal">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Caption>>({});
  const [saving, setSaving] = useState(false);

  const filtered = captions.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      c.content?.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.profile_id?.toLowerCase().includes(q);
    const matchesFilter =
      filterFeatured === "all" ||
      (filterFeatured === "featured" && c.is_featured) ||
      (filterFeatured === "normal" && !c.is_featured);
    return matchesSearch && matchesFilter;
  });

  const startEdit = (caption: Caption) => {
    setEditing(caption.id);
    setEditData({
      content: caption.content,
      is_public: caption.is_public,
      is_featured: caption.is_featured,
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("captions")
      .update({
        content: editData.content,
        is_public: editData.is_public,
        is_featured: editData.is_featured,
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

  const deleteCaption = async (id: string) => {
    if (!confirm("Are you sure you want to delete this caption?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("captions").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      router.refresh();
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by content, ID, or profile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={filterFeatured}
          onChange={(e) => setFilterFeatured(e.target.value as "all" | "featured" | "normal")}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All</option>
          <option value="featured">Featured only</option>
          <option value="normal">Non-featured</option>
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Caption
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                  Likes
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                  Public
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                  Featured
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Author
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/30">
                  {editing === c.id ? (
                    <>
                      <td className="px-4 py-3" colSpan={2}>
                        <textarea
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                          rows={2}
                          value={editData.content || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              content: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editData.is_public || false}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              is_public: e.target.checked,
                            })
                          }
                          className="rounded bg-gray-700 border-gray-600 text-indigo-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editData.is_featured || false}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              is_featured: e.target.checked,
                            })
                          }
                          className="rounded bg-gray-700 border-gray-600 text-indigo-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.profile_id?.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.created_datetime_utc?.slice(0, 10)}
                      </td>
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
                      <td className="px-4 py-3 max-w-md">
                        <p className="text-sm text-gray-200 truncate">
                          {c.content || "—"}
                        </p>
                        <p className="text-xs font-mono text-gray-500">
                          {c.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-pink-400 font-medium">
                          {c.like_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge active={c.is_public} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.is_featured ? (
                          <span className="text-amber-400 text-sm">⭐</span>
                        ) : (
                          <Badge active={false} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">
                        {c.profile_id?.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.created_datetime_utc?.slice(0, 10) || "—"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCaption(c.id)}
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
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500 text-sm"
                  >
                    No captions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Showing {filtered.length} of {captions.length} captions
      </p>
    </div>
  );
}

function Badge({ active }: { active: boolean | null }) {
  return active ? (
    <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" title="Yes" />
  ) : (
    <span className="inline-block w-3 h-3 rounded-full bg-gray-700" title="No" />
  );
}
