import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { isMockAdminEnabled, isClerkConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [vendor, warehouses, priceLists, roles, permissions, admins] = await Promise.all([
    prisma.vendor.findUnique({ where: { slug: "platform" } }),
    prisma.warehouse.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.priceList.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { permissions: true, assignments: true } } },
    }),
    prisma.permission.count(),
    prisma.admin.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        roleAssignments: { include: { role: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">System</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Vendor" v={vendor?.name ?? "—"} />
            <Row k="Slug" v={vendor?.slug ?? "—"} />
            <Row k="Currency" v="INR (single-currency MVP)" />
            <Row k="Locale" v="en-IN" />
            <Row k="Country" v="India" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              k="Mode"
              v={
                isMockAdminEnabled()
                  ? "Mock admin (dev)"
                  : isClerkConfigured()
                    ? "Clerk"
                    : "Unconfigured"
              }
            />
            {isMockAdminEnabled() ? (
              <p className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-700">
                Authentication is bypassed for local development. Add Clerk keys to{" "}
                <code className="rounded bg-background px-1">apps/admin/.env.local</code>{" "}
                and set <code className="rounded bg-background px-1">MOCK_ADMIN=false</code>{" "}
                before deploying.
              </p>
            ) : null}
            <Separator className="my-3" />
            <Row k="Admins" v={String(admins.length)} />
            <Row k="Roles" v={String(roles.length)} />
            <Row k="Permissions" v={String(permissions)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warehouses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warehouses.length === 0 ? (
              <p className="text-sm text-zinc-500">None configured.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {warehouses.map((w) => (
                  <li key={w.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{w.name}</p>
                      <p className="text-xs text-zinc-500">
                        {w.code} · {[w.city, w.state, w.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    {w.isDefault ? <Badge variant="outline">Default</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price lists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {priceLists.length === 0 ? (
              <p className="text-sm text-zinc-500">None configured.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {priceLists.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-zinc-500">
                        {p.code} · {p.currency}
                      </p>
                    </div>
                    {p.isDefault ? <Badge variant="outline">Default</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Provider" v="Postgres (direct)" />
            <p className="text-xs text-muted-foreground">
              Storefront search reads directly from the catalog. Any change you
              save here is reflected immediately — no reindex required.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {admins.length === 0 ? (
              <p className="text-sm text-zinc-500">No admins yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {admins.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {[a.firstName, a.lastName].filter(Boolean).join(" ") || a.email}
                      </p>
                      <p className="text-xs text-zinc-500">{a.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {a.roleAssignments.length === 0 ? (
                        <Badge variant="outline">No roles</Badge>
                      ) : (
                        a.roleAssignments.map((ra) => (
                          <Badge key={ra.id} variant="default">
                            {ra.role.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs uppercase tracking-widest text-zinc-500">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
  );
}
