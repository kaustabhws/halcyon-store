/**
 * Storefront navigation config — shared between the admin (which edits it)
 * and the storefront (which renders it). Stored in the Setting table under
 * one key (`storefront.nav`) as JSON. Pure types + helpers, no Prisma, so
 * both apps can import it.
 *
 * Backed by the Category tree: each nav item points at a category; in "mega"
 * mode an item can also surface a chosen set of that category's children as
 * a dropdown.
 */

export const NAV_MODES = ["simple", "mega"] as const;
export type NavMode = (typeof NAV_MODES)[number];

export const SIMPLE_MAX_ITEMS = 3;
export const NAV_SETTING_KEY = "storefront.nav";

export type NavItemConfig = {
  /** Category this item links to (a parent category for groups). */
  categoryId: string;
  /** Optional label override; falls back to the category name. */
  label?: string;
  /** Mega mode: which of the category's children to show in the dropdown. */
  childIds?: string[];
};

export type NavConfig = {
  mode: NavMode;
  items: NavItemConfig[];
};

export const DEFAULT_NAV: NavConfig = { mode: "simple", items: [] };

/** Minimal category-tree shape needed to resolve a config (matches the
 *  select used by `productRepo.listCategoryTree()`). */
export type NavCategoryNode = {
  id: string;
  slug: string;
  name: string;
  children: { id: string; slug: string; name: string }[];
};

export type ResolvedNavChild = { label: string; href: string };
export type ResolvedNavItem = {
  label: string;
  href: string;
  children: ResolvedNavChild[];
};

/** Validate + clamp an untrusted stored value into a NavConfig. */
export function parseNavConfig(raw: unknown): NavConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NAV };
  const obj = raw as Record<string, unknown>;
  const mode: NavMode = obj.mode === "mega" ? "mega" : "simple";

  const itemsRaw = Array.isArray(obj.items) ? obj.items : [];
  const items: NavItemConfig[] = [];
  for (const it of itemsRaw) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    if (typeof o.categoryId !== "string" || !o.categoryId) continue;
    const item: NavItemConfig = { categoryId: o.categoryId };
    if (typeof o.label === "string" && o.label.trim()) item.label = o.label.trim();
    if (Array.isArray(o.childIds)) {
      item.childIds = o.childIds.filter((x): x is string => typeof x === "string");
    }
    items.push(item);
  }

  return {
    mode,
    items: mode === "simple" ? items.slice(0, SIMPLE_MAX_ITEMS) : items,
  };
}

/**
 * Resolve a config against the live category tree into render-ready items.
 * Items whose category was deleted are dropped; child ids that no longer
 * exist under their parent are dropped. Labels fall back to category names.
 */
export function resolveNav(
  config: NavConfig,
  tree: NavCategoryNode[],
): ResolvedNavItem[] {
  const byId = new Map<string, { slug: string; name: string }>();
  const childrenOf = new Map<string, NavCategoryNode["children"]>();
  for (const root of tree) {
    byId.set(root.id, { slug: root.slug, name: root.name });
    childrenOf.set(root.id, root.children);
    for (const ch of root.children) {
      byId.set(ch.id, { slug: ch.slug, name: ch.name });
    }
  }

  const items = config.mode === "simple"
    ? config.items.slice(0, SIMPLE_MAX_ITEMS)
    : config.items;

  const out: ResolvedNavItem[] = [];
  for (const item of items) {
    const cat = byId.get(item.categoryId);
    if (!cat) continue;

    let children: ResolvedNavChild[] = [];
    if (config.mode === "mega" && item.childIds?.length) {
      const real = childrenOf.get(item.categoryId) ?? [];
      const childMap = new Map(real.map((c) => [c.id, c]));
      children = item.childIds
        .map((id) => childMap.get(id))
        .filter((c): c is NavCategoryNode["children"][number] => Boolean(c))
        .map((c) => ({ label: c.name, href: `/shop/${c.slug}` }));
    }

    out.push({
      label: item.label?.trim() || cat.name,
      href: `/shop/${cat.slug}`,
      children,
    });
  }
  return out;
}
