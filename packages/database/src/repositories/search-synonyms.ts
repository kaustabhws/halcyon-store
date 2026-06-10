/**
 * Curated query-time synonyms for the storefront search.
 *
 * Each entry maps one term to a list of equivalents. At query time, each
 * token is expanded to itself plus every term it shares a group with —
 * bidirectionally. So a customer typing "shoes" matches products whose
 * catalog data only ever says "sneakers", and vice versa.
 *
 * Rules of thumb when adding entries:
 *  - Use the singular, lowercase form (the tokenizer already lowercases).
 *  - Only add pairs that are truly interchangeable in customer intent.
 *    "Black" and "dark" might *feel* similar but lead to wildly different
 *    product sets; don't add them.
 *  - Brand names belong here only when a customer might type a generic
 *    word for them ("apple watch" → "watch"). Otherwise let the brand
 *    facet handle it.
 *
 * This file is the merchant's lever to fix specific zero-result queries.
 * If a search like "earpods" returns nothing in production, add it.
 */
const GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  // Footwear
  ["sneakers", "sneaker", "shoes", "shoe", "trainers", "trainer", "runners", "kicks"],

  // Headphones / earphones — your store's most likely vocabulary mismatch
  [
    "headphones",
    "headphone",
    "earphones",
    "earphone",
    "earbuds",
    "earbud",
    "earpods",
    "headset",
    "cans",
  ],
  ["in-ear", "inear", "iem"],
  ["over-ear", "overear"],
  ["on-ear", "onear"],

  // Wireless / connectivity
  ["wireless", "bluetooth", "bt", "cordless"],
  ["wired", "cabled", "corded"],
  ["noise-cancelling", "anc", "noise-cancellation", "nc"],

  // Watches
  ["watch", "watches", "timepiece", "wristwatch"],
  ["smartwatch", "smart-watch"],

  // Common color synonyms — only the ones customers actually type
  ["black", "noir", "jet"],
  ["white", "ivory"],
  ["grey", "gray", "graphite", "charcoal"],
  ["silver", "chrome"],
  ["gold", "golden"],
  ["blue", "navy"],
  ["red", "crimson"],

  // Materials / finishes
  ["leather", "leathers"],
];

/**
 * Lazy-built reverse map: term → set of all equivalent terms (including
 * itself). Memoized at module scope so it's computed once per process.
 */
let cachedIndex: Map<string, Set<string>> | null = null;

function buildIndex(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const group of GROUPS) {
    const set = new Set(group);
    for (const term of group) {
      const existing = map.get(term);
      if (existing) {
        // Merge into existing group (handles the rare case of a term
        // appearing in two source groups).
        for (const t of set) existing.add(t);
      } else {
        map.set(term, set);
      }
    }
  }
  return map;
}

/**
 * Return every search term that should be considered equivalent to the
 * input token — including the token itself. Always returns at least one
 * element. The result is deduped and lowercased.
 */
export function expandSynonyms(token: string): string[] {
  if (!cachedIndex) cachedIndex = buildIndex();
  const t = token.toLowerCase();
  const group = cachedIndex.get(t);
  if (!group) return [t];
  return [...group];
}
