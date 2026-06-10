import { prisma } from "../client.ts";
import type { Prisma } from "../generated/index.js";
import { expandSynonyms } from "./search-synonyms.ts";

const productInclude = {
  brand: true,
  imageAttribute: true,
  media: {
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    include: { attributeValue: { include: { attribute: true } } },
  },
  categories: { include: { category: true } },
  specifications: { orderBy: { position: "asc" } },
  variants: {
    where: { deletedAt: null },
    include: {
      attributes: {
        include: { attributeValue: { include: { attribute: true } } },
      },
      prices: { take: 1, orderBy: { updatedAt: "desc" } },
      inventory: true,
    },
  },
  reviews: {
    where: { status: "APPROVED", deletedAt: null },
    select: { rating: true },
  },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type VariantRow = ProductRow["variants"][number];

export type ProductCardView = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  brandName: string | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
  priceMinor: bigint;
  compareAtMinor: bigint | null;
  /** Highest variant price. Equal to `priceMinor` when there's a single variant. */
  maxPriceMinor: bigint;
  currency: string;
  inStock: boolean;
  variantCount: number;
  /** ID of the default variant — used for quick-add-to-cart on product cards. */
  defaultVariantId: string | null;
  /** Mean rating across approved reviews; null when no reviews. */
  averageRating: number | null;
  reviewCount: number;
};

export type ProductDetailView = ProductCardView & {
  description: string | null;
  /** True when admin enabled per-attribute images on this product. */
  useVariantImages: boolean;
  /** Attribute code whose values drive the gallery (e.g. "color"). Null when
   * no image attribute is set. */
  imageAttributeCode: string | null;
  media: Array<{
    url: string;
    altText: string | null;
    isPrimary: boolean;
    /** Attribute value this image is tagged to, as the canonical value
     * string (e.g. "black"). Null = shared across all values. */
    attributeValue: string | null;
  }>;
  specifications: Array<{ key: string; value: string }>;
  categories: Array<{ slug: string; name: string }>;
  variants: Array<{
    id: string;
    sku: string;
    name: string | null;
    isDefault: boolean;
    priceMinor: bigint;
    compareAtMinor: bigint | null;
    available: number;
    attributes: Array<{
      code: string;
      label: string;
      value: string;
      valueLabel: string;
      swatchHex: string | null;
    }>;
  }>;
};

export type ProductFilters = {
  q?: string;
  categorySlug?: string;
  brandSlugs?: string[];
  /**
   * Attribute filters grouped by code. Within a code values are OR'd; across
   * codes they're AND'd. Standard ecommerce facet semantics.
   *   [{code:"color", values:["black","red"]}, {code:"size", values:["m"]}]
   *   ⇒ (color=black OR color=red) AND (size=m)
   */
  attributes?: Array<{ code: string; values: string[] }>;
  minPriceMinor?: bigint;
  maxPriceMinor?: bigint;
  inStockOnly?: boolean;
  sort?: "relevance" | "newest" | "price-asc" | "price-desc";
  page?: number;
  pageSize?: number;
};

export type FacetView = {
  categories: Array<{ slug: string; name: string; count: number }>;
  brands: Array<{ slug: string; name: string; count: number }>;
  attributes: Array<{
    code: string;
    label: string;
    values: Array<{
      value: string;
      label: string;
      swatchHex: string | null;
      count: number;
    }>;
  }>;
  priceRange: { minMinor: bigint; maxMinor: bigint };
};

export type FindProductsResult = {
  items: ProductCardView[];
  totalCount: number;
  page: number;
  pageSize: number;
  facets: FacetView;
  /**
   * When a query yielded zero or very few results, the engine offers a
   * spelling-corrected suggestion. The UI typically renders this as
   * "Did you mean X?" with a link that re-runs the search.
   */
  suggestion: string | null;
};

function pickDefaultVariant(variants: VariantRow[]): VariantRow | undefined {
  return variants.find((v) => v.isDefault) ?? variants[0];
}

function variantAvailable(v: VariantRow): number {
  return v.inventory.reduce((sum, i) => sum + (i.onHand - i.reserved), 0);
}

function priceRowsOf(p: ProductRow): Array<{ amountMinor: bigint; compareAtAmountMinor: bigint | null; currency: string }> {
  return p.variants
    .map((v) => v.prices[0])
    .filter((x): x is NonNullable<typeof x> => x != null);
}

function toCard(p: ProductRow): ProductCardView {
  const primary = p.media[0];
  const inStock = p.variants.some((v) => variantAvailable(v) > 0);

  const priceRows = priceRowsOf(p);
  const def = pickDefaultVariant(p.variants);
  const defPrice = def?.prices[0];
  const minPrice = priceRows.length
    ? priceRows.reduce(
        (m, x) => (x.amountMinor < m ? x.amountMinor : m),
        priceRows[0]!.amountMinor,
      )
    : 0n;
  const maxPrice = priceRows.length
    ? priceRows.reduce(
        (m, x) => (x.amountMinor > m ? x.amountMinor : m),
        priceRows[0]!.amountMinor,
      )
    : 0n;
  const currency = defPrice?.currency ?? priceRows[0]?.currency ?? "INR";

  const reviewCount = p.reviews.length;
  const averageRating =
    reviewCount > 0
      ? p.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : null;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    brandName: p.brand?.name ?? null,
    primaryImageUrl: primary?.url ?? null,
    primaryImageAlt: primary?.altText ?? null,
    priceMinor: minPrice,
    compareAtMinor: defPrice?.compareAtAmountMinor ?? null,
    maxPriceMinor: maxPrice,
    currency,
    inStock,
    variantCount: p.variants.length,
    defaultVariantId: def?.id ?? null,
    averageRating,
    reviewCount,
  };
}

export async function listFeaturedProducts(limit = 8): Promise<ProductCardView[]> {
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", isFeatured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: productInclude,
  });
  return rows.map(toCard);
}

/**
 * Builds the Prisma `where` for a filter set. Stops short of the price /
 * inventory subqueries because those require post-fetch JS evaluation
 * (Prisma can't do `onHand - reserved > 0` natively).
 *
 * Query semantics: the user's text is tokenized on whitespace, and each
 * token must match somewhere — product name, short/long description, brand
 * name, category name, OR an attribute-value label. This expansion is what
 * lets "headphones" find products in the Headphones category even when no
 * individual product is literally named "Headphones".
 */
function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
  };

  if (filters.q?.trim()) {
    const tokens = tokenize(filters.q);
    if (tokens.length > 0) {
      // Each token AND'd. For each token: expand via synonyms, then OR all
      // synonym variants across name/desc/brand/category/attribute. This is
      // how "shoes" finds products tagged with category "Sneakers": the
      // synonym map turns one token into many before the SQL is built.
      const perTokenClauses: Prisma.ProductWhereInput[] = tokens.map((t) => {
        const variants = expandSynonyms(t);
        const variantOrs: Prisma.ProductWhereInput[] = variants.flatMap(
          (v) => [
            { name: { contains: v, mode: "insensitive" } },
            { shortDescription: { contains: v, mode: "insensitive" } },
            { description: { contains: v, mode: "insensitive" } },
            { brand: { name: { contains: v, mode: "insensitive" } } },
            {
              categories: {
                some: {
                  category: { name: { contains: v, mode: "insensitive" } },
                },
              },
            },
            {
              variants: {
                some: {
                  attributes: {
                    some: {
                      attributeValue: {
                        OR: [
                          { label: { contains: v, mode: "insensitive" } },
                          { value: { contains: v, mode: "insensitive" } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],
        );
        return { OR: variantOrs };
      });
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        ...perTokenClauses,
      ];
    }
  }

  if (filters.categorySlug) {
    where.categories = { some: { category: { slug: filters.categorySlug } } };
  }

  if (filters.brandSlugs?.length) {
    where.brand = { slug: { in: filters.brandSlugs } };
  }

  if (filters.attributes?.length) {
    const ands: Prisma.ProductWhereInput[] = filters.attributes
      .filter((a) => a.values.length > 0)
      .map((a) => ({
        variants: {
          some: {
            attributes: {
              some: {
                attributeValue: {
                  attribute: { code: a.code },
                  value: { in: a.values },
                },
              },
            },
          },
        },
      }));
    if (ands.length > 0) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...ands];
    }
  }

  return where;
}

/**
 * Split a search query into normalized tokens. Drops single-character
 * stopwords and anything that's pure punctuation. Lowercased.
 */
function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^\p{L}\p{N}-]+/gu, ""))
    .filter((t) => t.length >= 2);
}

/**
 * Per-product relevance score for search queries. Higher is better.
 * Field weights (descending): exact name > name contains > brand contains >
 * category contains > description contains > attribute contains. A token
 * matching multiple fields stacks scores, so a query that matches both the
 * product name AND its brand ranks above one that only matches the brand.
 *
 * Synonym handling: each token is expanded via the synonym map and the
 * best-scoring variant wins. This means "shoes" still ranks correctly
 * against products tagged "sneakers" — the synonym variant "sneakers"
 * scores against all fields, and we take the max.
 */
function relevanceScore(p: ProductRow, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const name = p.name.toLowerCase();
  const brand = (p.brand?.name ?? "").toLowerCase();
  const shortDesc = (p.shortDescription ?? "").toLowerCase();
  const longDesc = (p.description ?? "").toLowerCase();
  const categoryNames = p.categories
    .map((pc) => pc.category.name.toLowerCase())
    .join(" ");
  const attrLabels = p.variants
    .flatMap((v) => v.attributes)
    .map((a) =>
      `${a.attributeValue.label} ${a.attributeValue.value}`.toLowerCase(),
    )
    .join(" ");

  let score = 0;
  for (const t of tokens) {
    // Score the original token AND each synonym; take the best per token.
    // Synonyms cost a small penalty so a literal hit always beats a
    // synonym hit when both are possible.
    const variants = expandSynonyms(t);
    let best = 0;
    for (const v of variants) {
      const isOriginal = v === t;
      let s = 0;
      if (name === v) s += 100;
      else if (name.startsWith(v)) s += 40;
      else if (name.includes(v)) s += 25;

      if (brand.includes(v)) s += 12;
      if (categoryNames.includes(v)) s += 10;
      if (shortDesc.includes(v)) s += 6;
      if (longDesc.includes(v)) s += 3;
      if (attrLabels.includes(v)) s += 4;

      if (!isOriginal) s = Math.floor(s * 0.85);
      if (s > best) best = s;
    }
    score += best;
  }
  // Featured products get a tiny nudge so they break ties.
  if (p.isFeatured) score += 1;
  return score;
}

function compareForSort(
  sort: ProductFilters["sort"],
  a: ProductRow,
  b: ProductRow,
  scoreA = 0,
  scoreB = 0,
): number {
  if (sort === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
  if (sort === "price-asc") {
    const ap = priceRowsOf(a)[0]?.amountMinor ?? 0n;
    const bp = priceRowsOf(b)[0]?.amountMinor ?? 0n;
    return ap < bp ? -1 : ap > bp ? 1 : 0;
  }
  if (sort === "price-desc") {
    const ap = priceRowsOf(a)[0]?.amountMinor ?? 0n;
    const bp = priceRowsOf(b)[0]?.amountMinor ?? 0n;
    return ap < bp ? 1 : ap > bp ? -1 : 0;
  }
  // relevance: when a query was provided, score breaks ties. Without a
  // query, fall back to featured-first then newest.
  if (scoreA !== scoreB) return scoreB - scoreA;
  if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function inPriceRange(p: ProductRow, filters: ProductFilters): boolean {
  if (filters.minPriceMinor == null && filters.maxPriceMinor == null) return true;
  const prices = priceRowsOf(p).map((x) => x.amountMinor);
  if (prices.length === 0) return false;
  return prices.some((amt) => {
    if (filters.minPriceMinor != null && amt < filters.minPriceMinor) return false;
    if (filters.maxPriceMinor != null && amt > filters.maxPriceMinor) return false;
    return true;
  });
}

function isInStock(p: ProductRow): boolean {
  return p.variants.some((v) => variantAvailable(v) > 0);
}

/**
 * Computes facet counts from an already-filtered set. Counts are intersected
 * (i.e. drilling-down semantics) — a value's count reflects how many matching
 * products would remain after also applying that value as a filter.
 */
function computeFacets(rows: ProductRow[]): FacetView {
  // Categories
  const catMap = new Map<string, { slug: string; name: string; count: number }>();
  // Brands
  const brandMap = new Map<string, { slug: string; name: string; count: number }>();
  // Attributes: code → ValueMap
  const attrMap = new Map<
    string,
    {
      code: string;
      label: string;
      values: Map<
        string,
        { value: string; label: string; swatchHex: string | null; count: number }
      >;
    }
  >();

  let priceMin: bigint | null = null;
  let priceMax: bigint | null = null;

  for (const p of rows) {
    for (const pc of p.categories) {
      const c = pc.category;
      const cur = catMap.get(c.slug);
      if (cur) cur.count += 1;
      else catMap.set(c.slug, { slug: c.slug, name: c.name, count: 1 });
    }

    if (p.brand) {
      const cur = brandMap.get(p.brand.slug);
      if (cur) cur.count += 1;
      else
        brandMap.set(p.brand.slug, {
          slug: p.brand.slug,
          name: p.brand.name,
          count: 1,
        });
    }

    // Per-product unique (code,value) — so two variants with the same color
    // don't double-count.
    const seen = new Set<string>();
    for (const v of p.variants) {
      for (const a of v.attributes) {
        const code = a.attributeValue.attribute.code;
        const label = a.attributeValue.attribute.label;
        const value = a.attributeValue.value;
        const valueLabel = a.attributeValue.label;
        const swatchHex = a.attributeValue.swatchHex;
        const key = `${code}::${value}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let group = attrMap.get(code);
        if (!group) {
          group = { code, label, values: new Map() };
          attrMap.set(code, group);
        }
        const cur = group.values.get(value);
        if (cur) cur.count += 1;
        else group.values.set(value, { value, label: valueLabel, swatchHex, count: 1 });
      }
    }

    for (const pr of priceRowsOf(p)) {
      if (priceMin == null || pr.amountMinor < priceMin) priceMin = pr.amountMinor;
      if (priceMax == null || pr.amountMinor > priceMax) priceMax = pr.amountMinor;
    }
  }

  return {
    categories: [...catMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    brands: [...brandMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    attributes: [...attrMap.values()]
      .map((g) => ({
        code: g.code,
        label: g.label,
        values: [...g.values.values()].sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    priceRange: {
      minMinor: priceMin ?? 0n,
      maxMinor: priceMax ?? 0n,
    },
  };
}

/**
 * Unified browse + search. Returns a paginated slice plus drill-down facets
 * computed from the same filtered set.
 *
 * Implementation note: we load all matching products in a single query then
 * filter / sort / facet in JS. For catalogs up to a few thousand products
 * this is sub-100ms on Neon and avoids the query orchestration cost of doing
 * separate count + facet aggregation queries. Past that scale, swap the
 * facets to grouped SQL aggregations.
 */
export async function findProducts(
  filters: ProductFilters,
): Promise<FindProductsResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));
  const tokens = filters.q ? tokenize(filters.q) : [];

  const rows = await prisma.product.findMany({
    where: buildWhere(filters),
    include: productInclude,
  });

  // Apply post-fetch filters that Prisma can't express cleanly.
  const filtered = rows.filter((p) => {
    if (!inPriceRange(p, filters)) return false;
    if (filters.inStockOnly && !isInStock(p)) return false;
    return true;
  });

  // Score relevance once so the comparator and (later) the page slice can
  // both use it without recomputing.
  const scored = filtered.map((p) => ({
    row: p,
    score: tokens.length > 0 ? relevanceScore(p, tokens) : 0,
  }));

  scored.sort((a, b) =>
    compareForSort(filters.sort, a.row, b.row, a.score, b.score),
  );

  const totalCount = scored.length;
  const items = scored
    .slice((page - 1) * pageSize, page * pageSize)
    .map((s) => toCard(s.row));

  // Did-you-mean: if a query produced nothing, look for a close-spelled
  // alternative against the live catalog vocabulary. We compute this
  // lazily — only on zero-result queries — so the cost is paid exactly
  // when it might be useful.
  let suggestion: string | null = null;
  if (tokens.length > 0 && totalCount === 0) {
    suggestion = await suggestForQuery(filters.q ?? "");
  }

  return {
    items,
    totalCount,
    page,
    pageSize,
    facets: computeFacets(scored.map((s) => s.row)),
    suggestion,
  };
}

export async function listProducts(opts: {
  categorySlug?: string;
  brandSlug?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: ProductCardView[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const result = await findProducts({
    categorySlug: opts.categorySlug,
    brandSlugs: opts.brandSlug ? [opts.brandSlug] : undefined,
    page: opts.page,
    pageSize: opts.pageSize,
  });
  return {
    items: result.items,
    totalCount: result.totalCount,
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetailView | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: productInclude,
  });
  if (!product) return null;

  const card = toCard(product);
  return {
    ...card,
    description: product.description,
    useVariantImages: product.useVariantImages,
    imageAttributeCode: product.imageAttribute?.code ?? null,
    media: product.media.map((m) => ({
      url: m.url,
      altText: m.altText,
      isPrimary: m.isPrimary,
      attributeValue: m.attributeValue?.value ?? null,
    })),
    specifications: product.specifications.map((s) => ({
      key: s.key,
      value: s.value,
    })),
    categories: product.categories.map((pc) => ({
      slug: pc.category.slug,
      name: pc.category.name,
    })),
    variants: product.variants.map((v) => {
      const price = v.prices[0];
      return {
        id: v.id,
        sku: v.sku,
        name: v.name,
        isDefault: v.isDefault,
        priceMinor: price?.amountMinor ?? 0n,
        compareAtMinor: price?.compareAtAmountMinor ?? null,
        available: variantAvailable(v),
        attributes: v.attributes.map((va) => ({
          code: va.attributeValue.attribute.code,
          label: va.attributeValue.attribute.label,
          value: va.attributeValue.value,
          valueLabel: va.attributeValue.label,
          swatchHex: va.attributeValue.swatchHex,
        })),
      };
    }),
  };
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true, description: true, imageUrl: true },
  });
}

/**
 * Compute Levenshtein edit distance between two strings. Standard DP
 * implementation with two rolling rows; O(n×m) time, O(min(n,m)) space.
 *
 * Used by the did-you-mean suggester — small inputs (≤ ~30 chars) so the
 * quadratic cost is negligible.
 */
function editDistance(a: string, a2: string): number {
  if (a === a2) return 0;
  if (a.length === 0) return a2.length;
  if (a2.length === 0) return a.length;
  // Ensure `a` is the shorter string so the rolling row stays small.
  const [s, t] = a.length <= a2.length ? [a, a2] : [a2, a];
  let prev = new Array<number>(s.length + 1);
  let curr = new Array<number>(s.length + 1);
  for (let i = 0; i <= s.length; i++) prev[i] = i;
  for (let j = 1; j <= t.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= s.length; i++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1]! + 1,
        prev[i]! + 1,
        prev[i - 1]! + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[s.length]!;
}

let cachedDictionary: { terms: string[]; expiresAt: number } | null = null;

/**
 * Build the live catalog vocabulary used by the did-you-mean suggester.
 * Pulls product names, brand names, category names, and attribute value
 * labels from the DB, splits them into tokens, dedupes, and caches for
 * 60s so repeated zero-result searches don't pound Postgres.
 */
async function getDictionary(): Promise<string[]> {
  if (cachedDictionary && cachedDictionary.expiresAt > Date.now()) {
    return cachedDictionary.terms;
  }

  const [products, brands, categories, attrValues] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: { name: true },
    }),
    prisma.brand.findMany({
      where: { deletedAt: null },
      select: { name: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      select: { name: true },
    }),
    prisma.attributeValue.findMany({
      select: { label: true, value: true },
    }),
  ]);

  const set = new Set<string>();
  const addTokens = (raw: string | null | undefined) => {
    if (!raw) return;
    for (const t of tokenize(raw)) set.add(t);
  };
  for (const p of products) addTokens(p.name);
  for (const b of brands) addTokens(b.name);
  for (const c of categories) addTokens(c.name);
  for (const av of attrValues) {
    addTokens(av.label);
    addTokens(av.value);
  }

  const terms = [...set];
  cachedDictionary = { terms, expiresAt: Date.now() + 60_000 };
  return terms;
}

/**
 * Returns a corrected variant of the user's query — or null if every token
 * is already a known catalog term, or no token has a close-enough match.
 *
 * Per-token rule: if the original token is in the dictionary, keep it;
 * otherwise pick the dictionary term within edit distance ≤ ⌈len/3⌉ that
 * has the smallest distance. We require at least one token to actually
 * change before returning a suggestion — otherwise we'd echo the query
 * back to the user, which is worse than nothing.
 */
async function suggestForQuery(query: string): Promise<string | null> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;
  const dictionary = await getDictionary();
  if (dictionary.length === 0) return null;
  const dictSet = new Set(dictionary);

  let changed = false;
  const corrected = tokens.map((tok) => {
    if (dictSet.has(tok)) return tok;
    const maxDist = Math.max(1, Math.ceil(tok.length / 3));
    let best: string | null = null;
    let bestDist = Infinity;
    for (const term of dictionary) {
      // Quick reject by length difference — saves the DP for obvious misses.
      if (Math.abs(term.length - tok.length) > maxDist) continue;
      const d = editDistance(tok, term);
      if (d < bestDist && d <= maxDist) {
        bestDist = d;
        best = term;
        if (d === 1) break; // Distance 1 is good enough; stop scanning.
      }
    }
    if (best) {
      changed = true;
      return best;
    }
    return tok;
  });

  return changed ? corrected.join(" ") : null;
}
