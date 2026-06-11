// One-off generator: pulls real product data from DummyJSON, maps it onto the
// store's category tree with INR pricing + size variants, merges curated
// products for categories DummyJSON lacks, and writes seed-data.json.
// Run: node prisma/gen-seed-data.mjs   (needs network)

import { writeFileSync } from "node:fs";

const slugify = (s) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// --- category tree -------------------------------------------------------
const PARENTS = [
  { slug: "men", name: "Men", description: "Menswear, footwear and accessories." },
  { slug: "women", name: "Women", description: "Womenswear, lingerie and jewelry." },
  { slug: "beauty", name: "Beauty", description: "Skincare, makeup and fragrance." },
  { slug: "home", name: "Home", description: "For every corner of your home." },
];
const CHILDREN = [
  { slug: "mens-t-shirts", name: "T-Shirts", parent: "men" },
  { slug: "mens-shirts", name: "Shirts", parent: "men" },
  { slug: "mens-jeans", name: "Jeans", parent: "men" },
  { slug: "mens-shoes", name: "Shoes", parent: "men" },
  { slug: "mens-watches", name: "Watches", parent: "men" },
  { slug: "mens-accessories", name: "Accessories", parent: "men" },
  { slug: "womens-tops", name: "Tops", parent: "women" },
  { slug: "womens-bras", name: "Bras", parent: "women" },
  { slug: "womens-lingerie", name: "Lingerie", parent: "women" },
  { slug: "womens-jewelry", name: "Jewelry", parent: "women" },
  { slug: "womens-jeans", name: "Jeans", parent: "women" },
  { slug: "beauty-skincare", name: "Skincare", parent: "beauty" },
  { slug: "beauty-makeup", name: "Makeup", parent: "beauty" },
  { slug: "beauty-fragrance", name: "Fragrance", parent: "beauty" },
  { slug: "beauty-haircare", name: "Haircare", parent: "beauty" },
  { slug: "home-bedding", name: "Bedding", parent: "home" },
  { slug: "home-kitchen", name: "Kitchen", parent: "home" },
  { slug: "home-decor", name: "Decor", parent: "home" },
  { slug: "home-lighting", name: "Lighting", parent: "home" },
];

// --- attributes ----------------------------------------------------------
const ATTRS = [
  {
    code: "color", label: "Color", kind: "SWATCH",
    values: [
      { v: "black", l: "Black", hex: "#0a0a0a" },
      { v: "white", l: "White", hex: "#fafafa" },
      { v: "grey", l: "Grey", hex: "#6b7280" },
      { v: "navy", l: "Navy", hex: "#1e3a8a" },
      { v: "blue", l: "Blue", hex: "#2563eb" },
      { v: "red", l: "Red", hex: "#dc2626" },
      { v: "green", l: "Green", hex: "#16a34a" },
      { v: "brown", l: "Brown", hex: "#6b4f3b" },
      { v: "silver", l: "Silver", hex: "#c0c0c0" },
    ],
  },
  {
    code: "apparel-size", label: "Size", kind: "LIST",
    values: [
      { v: "xs", l: "XS" }, { v: "s", l: "S" }, { v: "m", l: "M" },
      { v: "l", l: "L" }, { v: "xl", l: "XL" }, { v: "xxl", l: "XXL" },
    ],
  },
  {
    code: "shoe-size", label: "Size", kind: "LIST",
    values: [
      { v: "uk-7", l: "UK 7" }, { v: "uk-8", l: "UK 8" },
      { v: "uk-9", l: "UK 9" }, { v: "uk-10", l: "UK 10" }, { v: "uk-11", l: "UK 11" },
    ],
  },
];
const APPAREL_SIZES = ["s", "m", "l", "xl"];
const SHOE_SIZES = ["uk-7", "uk-8", "uk-9", "uk-10"];

// --- product mapping (DummyJSON id -> placement) -------------------------
// size: "apparel" | "shoe" | "none"; color: filterable swatch (omit for
// beauty/fragrance/haircare where color isn't a sensible facet).
const MAP = [
  { id: 84, cat: "mens-t-shirts", price: 1299, compare: 1799, feat: true, size: "apparel", color: "black" },
  { id: 85, cat: "mens-shirts", price: 1999, size: "apparel", color: "navy" },
  { id: 88, cat: "mens-shoes", price: 14995, compare: 16995, feat: true, size: "shoe", color: "red" },
  { id: 90, cat: "mens-shoes", price: 7999, size: "shoe", color: "blue" },
  { id: 94, cat: "mens-watches", price: 165000, size: "none", color: "silver" },
  { id: 155, cat: "mens-accessories", price: 1499, size: "none", color: "black" },
  { id: 158, cat: "mens-accessories", price: 999, size: "none", color: "black" },
  { id: 164, cat: "womens-tops", price: 1799, size: "apparel", color: "grey" },
  { id: 166, cat: "womens-tops", price: 2199, compare: 2799, feat: true, size: "apparel", color: "red" },
  { id: 179, cat: "womens-lingerie", price: 2499, size: "apparel", color: "black" },
  { id: 182, cat: "womens-jewelry", price: 899, size: "none", color: "green" },
  { id: 184, cat: "womens-jewelry", price: 699, size: "none", color: "green" },
  { id: 119, cat: "beauty-skincare", price: 499, size: "none" },
  { id: 2, cat: "beauty-makeup", price: 1299, compare: 1599, feat: true, size: "none" },
  { id: 4, cat: "beauty-makeup", price: 599, size: "none" },
  { id: 8, cat: "beauty-fragrance", price: 9500, size: "none" },
  { id: 11, cat: "home-bedding", price: 89999, feat: true, size: "none", color: "brown" },
  { id: 66, cat: "home-kitchen", price: 8990, compare: 10990, size: "none", color: "black" },
  { id: 61, cat: "home-kitchen", price: 2499, size: "none", color: "white" },
  { id: 45, cat: "home-decor", price: 1299, size: "none", color: "green" },
  { id: 47, cat: "home-lighting", price: 1999, size: "none", color: "black" },
];

// --- curated products for gaps DummyJSON has no good match for -----------
const CURATED = [
  {
    cat: "mens-jeans", name: "Levi's 511 Slim Fit Jeans", brand: "Levi's",
    price: 2999, compare: 3999, size: "apparel", color: "blue",
    short: "The original slim — sits below the waist with a slim leg from hip to ankle.",
    long: "Levi's most versatile slim jean in stretch denim that moves with you. A modern, narrow silhouette cut close through the seat and thigh with a slim leg opening.",
    img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200",
    specs: [["Fit", "Slim"], ["Fabric", "98% Cotton, 2% Elastane"], ["Rise", "Mid rise"], ["Care", "Machine wash cold"]],
  },
  {
    cat: "womens-jeans", name: "Levi's 721 High Rise Skinny Jeans", brand: "Levi's",
    price: 2799, compare: 3499, size: "apparel", color: "blue",
    short: "A high, defining waist with a skinny leg for a sleek, lengthening look.",
    long: "The 721 sits at the natural waist and runs skinny through the hip, thigh and ankle in comfort-stretch denim that holds its shape all day.",
    img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200",
    specs: [["Fit", "Skinny"], ["Fabric", "Comfort-stretch denim"], ["Rise", "High rise"], ["Care", "Machine wash cold"]],
  },
  {
    cat: "womens-bras", name: "Jockey Wirefree Cotton Bra", brand: "Jockey",
    price: 799, size: "apparel", color: "black",
    short: "Soft, breathable everyday wirefree bra in combed cotton.",
    long: "A seamless, wirefree everyday bra with full cup coverage and soft cushioned straps. Made from skin-friendly combed cotton for all-day comfort.",
    img: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200",
    specs: [["Type", "Wirefree, non-padded"], ["Fabric", "Combed cotton blend"], ["Coverage", "Full cup"], ["Care", "Hand wash"]],
  },
  {
    cat: "beauty-haircare", name: "L'Oréal Paris Total Repair 5 Shampoo", brand: "L'Oréal Paris",
    price: 699, compare: 799, size: "none",
    short: "Repairs the 5 signs of damaged hair — hair fall, dryness, roughness, dullness, split ends.",
    long: "Infused with Pro-Keratin and Ceramide, Total Repair 5 reinforces hair fibre, leaving hair visibly healthier, smoother and stronger with every wash.",
    img: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1200",
    specs: [["Volume", "640 ml"], ["Hair type", "Damaged hair"], ["Key actives", "Pro-Keratin, Ceramide"], ["Sulphate", "Contains SLES"]],
  },
];

function buildSpecsFromDummy(p) {
  const specs = [];
  if (p.dimensions) {
    specs.push(["Dimensions", `${p.dimensions.width} × ${p.dimensions.height} × ${p.dimensions.depth} cm`]);
  }
  if (p.weight) specs.push(["Weight", `${p.weight}`]);
  if (p.warrantyInformation) specs.push(["Warranty", p.warrantyInformation]);
  if (p.returnPolicy) specs.push(["Returns", p.returnPolicy]);
  if (Array.isArray(p.tags) && p.tags.length) specs.push(["Tags", p.tags.join(", ")]);
  return specs;
}

function variantsFor(size, color, baseSku, pricePaise, comparePaise) {
  const colorAttr = color ? [{ code: "color", value: color }] : [];
  if (size === "none") {
    return [{ sku: `${baseSku}-STD`, name: "Standard", pricePaise, comparePaise, onHand: 40, attrs: [...colorAttr], isDefault: true }];
  }
  const list = size === "shoe" ? SHOE_SIZES : APPAREL_SIZES;
  const code = size === "shoe" ? "shoe-size" : "apparel-size";
  return list.map((v, i) => ({
    sku: `${baseSku}-${v.toUpperCase().replace(/-/g, "")}`,
    name: v.toUpperCase().replace("UK-", "UK "),
    pricePaise, comparePaise,
    onHand: [18, 24, 16, 10, 8][i] ?? 12,
    attrs: [{ code, value: v }, ...colorAttr],
    isDefault: i === 1 || (list.length === 1 && i === 0),
  }));
}

async function main() {
  const res = await fetch("https://dummyjson.com/products?limit=0");
  const { products } = await res.json();
  const byId = new Map(products.map((p) => [p.id, p]));

  const seedProducts = [];
  const brandSet = new Set();

  // DummyJSON-backed
  for (const m of MAP) {
    const p = byId.get(m.id);
    if (!p) throw new Error(`DummyJSON id ${m.id} missing`);
    const brand = p.brand || null;
    if (brand) brandSet.add(brand);
    const slug = slugify(p.title);
    const baseSku = slug.toUpperCase().split("-").slice(0, 3).join("-").slice(0, 16);
    const pricePaise = m.price * 100;
    const comparePaise = m.compare ? m.compare * 100 : undefined;
    const images = (p.images && p.images.length ? p.images : [p.thumbnail]).slice(0, 3);
    seedProducts.push({
      slug, name: p.title, brand, category: m.cat,
      short: p.description.length > 140 ? p.description.slice(0, 137).trimEnd() + "…" : p.description,
      long: p.description,
      featured: !!m.feat,
      media: images.map((url, i) => ({ url, alt: `${p.title} ${i + 1}` })),
      specs: buildSpecsFromDummy(p).map(([key, value]) => ({ key, value })),
      variants: variantsFor(m.size, m.color, baseSku, pricePaise, comparePaise),
    });
  }

  // Curated
  for (const c of CURATED) {
    if (c.brand) brandSet.add(c.brand);
    const slug = slugify(c.name);
    const baseSku = slug.toUpperCase().split("-").slice(0, 3).join("-").slice(0, 16);
    seedProducts.push({
      slug, name: c.name, brand: c.brand, category: c.cat,
      short: c.short, long: c.long, featured: false,
      media: [{ url: c.img, alt: c.name }],
      specs: c.specs.map(([key, value]) => ({ key, value })),
      variants: variantsFor(c.size, c.color, baseSku, c.price * 100, c.compare ? c.compare * 100 : undefined),
    });
  }

  // Category images: child = first product image in that child; parent = first child's image.
  const firstImgByCat = {};
  for (const p of seedProducts) {
    if (!firstImgByCat[p.category]) firstImgByCat[p.category] = p.media[0].url;
  }
  const children = CHILDREN.map((c, i) => ({
    ...c, position: i,
    imageUrl: firstImgByCat[c.slug] ?? null,
    description: `${c.name} for the ${c.parent} collection.`,
  }));
  const parents = PARENTS.map((p, i) => {
    const firstChild = children.find((c) => c.parent === p.slug && c.imageUrl);
    return { ...p, position: i, imageUrl: firstChild?.imageUrl ?? null };
  });

  const brands = [...brandSet].sort().map((name) => ({ slug: slugify(name), name }));

  const nav = {
    mode: "mega",
    items: PARENTS.map((p) => ({
      categorySlug: p.slug,
      childSlugs: CHILDREN.filter((c) => c.parent === p.slug).map((c) => c.slug),
    })),
  };
  const heroProductSlug = seedProducts.find((p) => p.featured)?.slug ?? seedProducts[0].slug;

  const data = { brands, parents, children, attributes: ATTRS, products: seedProducts, nav, hero: { design: "split", productSlug: heroProductSlug } };
  writeFileSync(new URL("./seed-data.json", import.meta.url), JSON.stringify(data, null, 2));
  console.log(`wrote seed-data.json: ${brands.length} brands, ${parents.length} parents, ${children.length} children, ${seedProducts.length} products`);
}

main().catch((e) => { console.error(e); process.exit(1); });
