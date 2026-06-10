import { AdminSidebar } from "@/components/shell/sidebar";
import { AdminTopbar } from "@/components/shell/topbar";
import { requireAdmin, isMockAdminEnabled } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar
          user={{ fullName: admin.fullName, email: admin.email }}
          isMock={isMockAdminEnabled()}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
