import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/shell/sidebar";
import { AdminTopbar } from "@/components/shell/topbar";
import {
  requireAdmin,
  isMockAdminEnabled,
  NotAuthorizedError,
  type AdminContext,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin: AdminContext;
  try {
    admin = await requireAdmin();
  } catch (e) {
    // Authenticated but not an authorized admin → dedicated page (with a
    // sign-out). Not authenticated at all → Clerk sign-in.
    if (e instanceof NotAuthorizedError) redirect("/not-authorized");
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar
          user={{ fullName: admin.fullName, email: admin.email }}
          isMock={isMockAdminEnabled()}
          storefrontUrl={process.env.STOREFRONT_URL ?? "http://localhost:3000"}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
