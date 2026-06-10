import { NextResponse } from "next/server";
import { z } from "zod";
import { searchStorefront } from "@/lib/search";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().default(""),
  page: z.coerce.number().int().min(1).max(500).default(1),
  hitsPerPage: z.coerce.number().int().min(1).max(48).default(8),
});

/**
 * Lightweight endpoint for the Cmd+K typeahead. Returns just the hits the
 * dialog needs — no facets, no pagination metadata. For full search with
 * filters and facets, hit /search directly.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    page: url.searchParams.get("page") ?? undefined,
    hitsPerPage: url.searchParams.get("hitsPerPage") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const t0 = Date.now();
  const result = await searchStorefront({
    q: parsed.data.q,
    page: parsed.data.page,
    hitsPerPage: parsed.data.hitsPerPage,
  });

  // Strip down to only what the dialog needs and serialize bigints as numbers
  // (fine for paise — well below MAX_SAFE_INTEGER for INR products).
  const hits = result.hits.map((h) => ({
    id: h.id,
    slug: h.slug,
    name: h.name,
    brandName: h.brandName,
    primaryImageUrl: h.primaryImageUrl,
    minPricePaise: Number(h.priceMinor),
    maxPricePaise: Number(h.maxPriceMinor),
    inStock: h.inStock,
  }));

  return NextResponse.json({
    ok: true,
    hits,
    totalHits: result.totalHits,
    suggestion: result.suggestion,
    processingTimeMs: Date.now() - t0,
  });
}
