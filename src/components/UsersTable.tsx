"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  created_datetime_utc: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean | null;
  is_in_study: boolean | null;
  is_matrix_admin: boolean | null;
}

export default function UsersTable({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.email?.toLowerCase().includes(q) ||
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const startEdit = (profile: Profile) => {
    setEditing(profile.id);
    setEditData({
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      is_superadmin: profile.is_superadmin,
      is_in_study: profile.is_in_study,
      is_matrix_admin: profile.is_matrix_admin,
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update(editData)
      .eq("id", editing);
    setSaving(false);
    if (error) {
      alert("Failed to save: " + error.message);
    } else {
      setEditing(null);
      router.refresh();
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      router.refresh();
    }
  };

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                  Superadmin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                  In Study
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                  Matrix Admin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/30">
                  {editing === p.id ? (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <input
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 w-24"
                            value={editData.first_name || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                first_name: e.target.value,
                              })
                            }
                            placeholder="First"
                          />
                          <input
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 w-24"
                            value={editData.last_name || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                last_name: e.target.value,
                              })
                            }
                            placeholder="Last"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 w-48"
                          value={editData.email || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              email: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editData.is_superadmin || false}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              is_superadmin: e.target.checked,
                            })
                          }
                          className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editData.is_in_study || false}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              is_in_study: e.target.checked,
                            })
                          }
                          className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editData.is_matrix_admin || false}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              is_matrix_admin: e.target.checked,
                            })
                          }
                          className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {p.created_datetime_utc?.slice(0, 10)}
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
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm text-gray-200">
                            {[p.first_name, p.last_name]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </span>
                          <p className="text-xs text-gray-500 font-mono">
                            {p.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {p.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge active={p.is_superadmin} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge active={p.is_in_study} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge active={p.is_matrix_admin} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {p.created_datetime_utc?.slice(0, 10) || "—"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProfile(p.id)}
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
                    No profiles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Showing {filtered.length} of {profiles.length} profiles
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
