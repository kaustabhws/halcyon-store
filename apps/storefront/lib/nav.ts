import "server-only";
import { cache } from "react";
import { prisma, productRepo } from "@/lib/db";
import {
  parseNavConfig,
  resolveNav,
  NAV_SETTING_KEY,
  type NavMode,
  type ResolvedNavItem,
} from "@ecom/shared/nav";

export type ResolvedNav = { mode: NavMode; items: ResolvedNavItem[] };

/**
 * Fetch + resolve the storefront nav config against the live category tree.
 * Cached per request so the header, mobile nav, and footer share one lookup.
 */
export const getResolvedNav = cache(async (): Promise<ResolvedNav> => {
  const [tree, setting] = await Promise.all([
    productRepo.listCategoryTree(),
    prisma.setting.findFirst({
      where: { scope: "PLATFORM", vendorId: null, key: NAV_SETTING_KEY },
    }),
  ]);

  const config = parseNavConfig(setting?.value);
  const items = resolveNav(
    config,
    tree.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      children: r.children.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    })),
  );
  return { mode: config.mode, items };
});
