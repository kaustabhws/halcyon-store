/**
 * Admin search-sync facade. Meilisearch was removed in favor of direct
 * Postgres search; sync calls remain as no-op exports so existing admin
 * actions don't need to change. If a search index is reintroduced later,
 * implement the real sync here.
 */
export function isSearchConfigured(): boolean {
  // Postgres is the source of truth; "configured" is always true.
  return true;
}

export async function syncProductToSearch(_productId: string): Promise<void> {
  // No-op: storefront reads directly from Postgres, so any product change
  // is immediately visible. Function kept so callers don't need to be
  // edited every time we change search backends.
}

export async function reindexAllProducts(): Promise<{
  ok: boolean;
  count: number;
  error?: string;
}> {
  // No-op: same reasoning as above. We return a count of zero so the UI
  // doesn't claim work happened.
  return { ok: true, count: 0 };
}
