"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface ImageRow {
  id: string;
  created_datetime_utc: string | null;
  url: string | null;
  is_common_use: boolean | null;
  profile_id: string | null;
  additional_context: string | null;
  is_public: boolean | null;
  image_description: string | null;
}

export default function ImagesGrid({ images }: { images: ImageRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterPublic, setFilterPublic] = useState<"all" | "public" | "private">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ImageRow>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = images.filter((img) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      img.image_description?.toLowerCase().includes(q) ||
      img.additional_context?.toLowerCase().includes(q) ||
      img.id.toLowerCase().includes(q) ||
      img.url?.toLowerCase().includes(q);
    const matchesFilter =
      filterPublic === "all" ||
      (filterPublic === "public" && img.is_public) ||
      (filterPublic === "private" && !img.is_public);
    return matchesSearch && matchesFilter;
  });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("images")
      .update({
        additional_context: editData.additional_context,
        is_public: editData.is_public,
        is_common_use: editData.is_common_use,
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

  const deleteImage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("images").delete().eq("id", id);
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
          placeholder="Search by description, context, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={filterPublic}
          onChange={(e) => setFilterPublic(e.target.value as "all" | "public" | "private")}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All</option>
          <option value="public">Public only</option>
          <option value="private">Private only</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((img) => (
          <div
            key={img.id}
            className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden group"
          >
            {/* Image preview */}
            {img.url ? (
              <div className="relative h-48 bg-gray-800">
                <img
                  src={img.url}
                  alt={img.image_description || "Image"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).className =
                      "w-full h-full bg-gray-800 flex items-center justify-center";
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {img.is_public && (
                    <span className="bg-emerald-600/80 text-white text-xs px-2 py-0.5 rounded">
                      Public
                    </span>
                  )}
                  {img.is_common_use && (
                    <span className="bg-amber-600/80 text-white text-xs px-2 py-0.5 rounded">
                      Common Use
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-48 bg-gray-800 flex items-center justify-center text-gray-600">
                No image URL
              </div>
            )}

            <div className="p-4 space-y-2">
              {editing === img.id ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                    rows={3}
                    value={editData.additional_context || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        additional_context: e.target.value,
                      })
                    }
                    placeholder="Additional context..."
                  />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
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
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={editData.is_common_use || false}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            is_common_use: e.target.checked,
                          })
                        }
                        className="rounded bg-gray-700 border-gray-600 text-indigo-600"
                      />
                      Common Use
                    </label>
                  </div>
                  <div className="flex gap-2">
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
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-mono text-gray-500">
                    {img.id.slice(0, 8)}...
                  </p>
                  {img.image_description && (
                    <p
                      className={`text-sm text-gray-300 ${
                        expanded === img.id ? "" : "line-clamp-2"
                      }`}
                    >
                      {img.image_description}
                    </p>
                  )}
                  {img.image_description && img.image_description.length > 100 && (
                    <button
                      onClick={() =>
                        setExpanded(expanded === img.id ? null : img.id)
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      {expanded === img.id ? "Show less" : "Show more"}
                    </button>
                  )}
                  <p className="text-xs text-gray-500">
                    Uploaded {img.created_datetime_utc?.slice(0, 10) || "—"}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setEditing(img.id);
                        setEditData({
                          additional_context: img.additional_context,
                          is_public: img.is_public,
                          is_common_use: img.is_common_use,
                        });
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No images found.
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Showing {filtered.length} of {images.length} images
      </p>
    </div>
  );
}
