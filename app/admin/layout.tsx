import { requireCurrentUser } from "@/lib/current-user";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata = {
  title: "Recastr Admin Dashboard",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser("/admin");
  
  // Enforce admin access
  requireAdmin(user);
  
  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
