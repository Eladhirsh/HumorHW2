"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users & Profiles", icon: "👤" },
  { href: "/admin/images", label: "Images", icon: "🖼️" },
  { href: "/admin/captions", label: "Captions", icon: "💬" },
];

export default function AdminShell({
  profile,
  children,
}: {
  profile: { id: string; display_name?: string; email?: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">Humor Admin</h1>
          <p className="text-xs text-gray-500 mt-1">Superadmin Panel</p>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-sm text-gray-400 truncate mb-2">
            {profile.display_name || profile.email || profile.id}
          </div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
