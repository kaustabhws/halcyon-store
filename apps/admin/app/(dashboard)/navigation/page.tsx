import { prisma, productRepo } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavBuilder, type CatNode } from "@/components/navigation/nav-builder";
import { parseNavConfig, NAV_SETTING_KEY } from "@ecom/shared/nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Navigation" };

export default async function NavigationPage() {
  const [tree, setting] = await Promise.all([
    productRepo.listCategoryTree(),
    prisma.setting.findFirst({
      where: { scope: "PLATFORM", vendorId: null, key: NAV_SETTING_KEY },
    }),
  ]);

  const config = parseNavConfig(setting?.value);
  const builderTree: CatNode[] = tree.map((r) => ({
    id: r.id,
    name: r.name,
    children: r.children.map((c) => ({ id: c.id, name: c.name })),
  }));

  return (
    <div className="max-w-3xl space-y-6 p-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Storefront</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Navigation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Control the storefront navbar. Build sub-category dropdowns from your
          category tree — set a category&rsquo;s parent on the Categories page first.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Navbar</CardTitle>
        </CardHeader>
        <CardContent>
          {builderTree.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Create categories first, then configure the navbar.
            </p>
          ) : (
            <NavBuilder tree={builderTree} initial={config} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
