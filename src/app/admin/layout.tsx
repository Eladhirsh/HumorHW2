import { requireSuperAdmin } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireSuperAdmin();

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
