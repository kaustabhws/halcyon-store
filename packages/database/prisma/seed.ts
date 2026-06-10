/**
 * Seed: platform vendor, RBAC, default warehouse, demo catalog.
 * Idempotent — safe to re-run; existing rows are upserted by their natural keys.
 */
import { PrismaClient } from "../src/generated/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("seeding...");

  const vendor = await prisma.vendor.upsert({
    where: { slug: "platform" },
    update: {},
    create: { slug: "platform", name: "Platform", isPlatform: true },
  });

  await seedRBAC();
  await seedWarehouse(vendor.id);
  await seedPriceList(vendor.id);
  const brands = await seedBrands(vendor.id);
  const categories = await seedCategories(vendor.id);
  const attrs = await seedAttributes(vendor.id);
  await seedProducts(vendor.id, brands, categories, attrs);

  console.log("seed complete.");
}

async function seedRBAC() {
  const roles = [
    { name: "super_admin", description: "Full platform access", isSystem: true },
    { name: "admin", description: "Standard admin", isSystem: true },
    { name: "inventory_manager", description: "Inventory + warehouses", isSystem: true },
    { name: "marketing_manager", description: "Coupons + content", isSystem: true },
    { name: "finance_manager", description: "Orders + refunds", isSystem: true },
    { name: "support", description: "Customer support read-mostly", isSystem: true },
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: r,
    });
  }

  const permissions = [
    { key: "product.create", resource: "product", action: "create" },
    { key: "product.read", resource: "product", action: "read" },
    { key: "product.update", resource: "product", action: "update" },
    { key: "product.delete", resource: "product", action: "delete" },
    { key: "order.read", resource: "order", action: "read" },
    { key: "order.update", resource: "order", action: "update" },
    { key: "order.refund", resource: "order", action: "refund" },
    { key: "inventory.read", resource: "inventory", action: "read" },
    { key: "inventory.update", resource: "inventory", action: "update" },
    { key: "customer.read", resource: "customer", action: "read" },
    { key: "coupon.create", resource: "coupon", action: "create" },
    { key: "coupon.read", resource: "coupon", action: "read" },
    { key: "settings.read", resource: "settings", action: "read" },
    { key: "settings.update", resource: "settings", action: "update" },
  ];
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { resource: p.resource, action: p.action },
      create: p,
    });
  }

  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { name: "super_admin" } });
  const all = await prisma.permission.findMany();
  for (const p of all) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: p.id },
    });
  }
}

async function seedWarehouse(vendorId: string) {
  await prisma.warehouse.upsert({
    where: { vendorId_code: { vendorId, code: "WH-MAIN" } },
    update: {},
    create: {
      vendorId,
      code: "WH-MAIN",
      name: "Main Warehouse",
      city: "Bengaluru",
      state: "KA",
      country: "IN",
      isDefault: true,
    },
  });
}

async function seedPriceList(vendorId: string) {
  await prisma.priceList.upsert({
    where: { vendorId_code: { vendorId, code: "DEFAULT" } },
    update: {},
    create: {
      vendorId,
      code: "DEFAULT",
      name: "Default Price List",
      currency: "INR",
      isDefault: true,
    },
  });
}

async function seedBrands(vendorId: string) {
  const data = [
    { slug: "stride", name: "Stride" },
    { slug: "horizon", name: "Horizon" },
    { slug: "wavefront", name: "Wavefront" },
  ];
  const out: Record<string, string> = {};
  for (const b of data) {
    const row = await prisma.brand.upsert({
      where: { vendorId_slug: { vendorId, slug: b.slug } },
      update: { name: b.name },
      create: { ...b, vendorId },
    });
    out[b.slug] = row.id;
  }
  return out;
}

async function seedCategories(vendorId: string) {
  const data = [
    { slug: "sneakers", name: "Sneakers", description: "Performance and lifestyle footwear." },
    { slug: "watches", name: "Watches", description: "Wristwear, automatic and digital." },
    { slug: "headphones", name: "Headphones", description: "Over-ear, in-ear, wireless." },
  ];
  const out: Record<string, string> = {};
  for (let i = 0; i < data.length; i++) {
    const c = data[i]!;
    const row = await prisma.category.upsert({
      where: { vendorId_slug: { vendorId, slug: c.slug } },
      update: { name: c.name, description: c.description, position: i },
      create: { ...c, vendorId, position: i },
    });
    out[c.slug] = row.id;
  }
  return out;
}

async function seedAttributes(vendorId: string) {
  const defs = [
    { code: "color",            label: "Color",            kind: "SWATCH" as const,
      values: [
        { v: "black",   l: "Black",   hex: "#0a0a0a" },
        { v: "white",   l: "White",   hex: "#fafafa" },
        { v: "navy",    l: "Navy",    hex: "#1e3a8a" },
        { v: "silver",  l: "Silver",  hex: "#c0c0c0" },
        { v: "rose",    l: "Rose",    hex: "#e11d48" },
      ] },
    { code: "size",             label: "Size",             kind: "LIST" as const,
      values: [
        { v: "uk-7", l: "UK 7" },
        { v: "uk-8", l: "UK 8" },
        { v: "uk-9", l: "UK 9" },
        { v: "uk-10", l: "UK 10" },
        { v: "uk-11", l: "UK 11" },
      ] },
    { code: "case-color",       label: "Case Color",       kind: "SWATCH" as const,
      values: [
        { v: "silver", l: "Silver", hex: "#c0c0c0" },
        { v: "gold",   l: "Gold",   hex: "#d4af37" },
        { v: "graphite", l: "Graphite", hex: "#3a3a3a" },
      ] },
    { code: "strap-color",      label: "Strap Color",      kind: "SWATCH" as const,
      values: [
        { v: "black",  l: "Black",  hex: "#0a0a0a" },
        { v: "tan",    l: "Tan",    hex: "#c2a37a" },
        { v: "navy",   l: "Navy",   hex: "#1e3a8a" },
      ] },
    { code: "connectivity",     label: "Connectivity",     kind: "LIST" as const,
      values: [
        { v: "wired",    l: "Wired" },
        { v: "wireless", l: "Wireless" },
      ] },
    { code: "form-factor",      label: "Form Factor",      kind: "LIST" as const,
      values: [
        { v: "over-ear", l: "Over-ear" },
        { v: "in-ear",   l: "In-ear" },
        { v: "on-ear",   l: "On-ear" },
      ] },
  ];

  const out: Record<string, { id: string; values: Record<string, string> }> = {};
  for (const def of defs) {
    const attr = await prisma.attribute.upsert({
      where: { vendorId_code: { vendorId, code: def.code } },
      update: { label: def.label, kind: def.kind },
      create: { vendorId, code: def.code, label: def.label, kind: def.kind },
    });
    const valueMap: Record<string, string> = {};
    for (let i = 0; i < def.values.length; i++) {
      const dv = def.values[i]!;
      const av = await prisma.attributeValue.upsert({
        where: { attributeId_value: { attributeId: attr.id, value: dv.v } },
        update: { label: dv.l, swatchHex: "hex" in dv ? dv.hex : null, position: i },
        create: { attributeId: attr.id, value: dv.v, label: dv.l, swatchHex: "hex" in dv ? dv.hex : null, position: i },
      });
      valueMap[dv.v] = av.id;
    }
    out[def.code] = { id: attr.id, values: valueMap };
  }
  return out;
}

type ProductSeed = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  short: string;
  long: string;
  featured?: boolean;
  variants: Array<{
    sku: string;
    name: string;
    pricePaise: number;
    compareAtPaise?: number;
    onHand: number;
    attrs: Array<{ code: string; value: string }>;
    isDefault?: boolean;
  }>;
  media: Array<{ url: string; alt: string }>;
  specs: Array<{ key: string; value: string }>;
};

async function seedProducts(
  vendorId: string,
  brands: Record<string, string>,
  categories: Record<string, string>,
  attrs: Record<string, { id: string; values: Record<string, string> }>,
) {
  const warehouse = await prisma.warehouse.findFirstOrThrow({ where: { vendorId, isDefault: true } });
  const priceList = await prisma.priceList.findFirstOrThrow({ where: { vendorId, isDefault: true } });

  const products: ProductSeed[] = [
    {
      slug: "stride-aero-runner",
      name: "Stride Aero Runner",
      brand: "stride", category: "sneakers", featured: true,
      short: "Lightweight daily runner with responsive foam.",
      long: "Engineered mesh upper, dual-density EVA, and a carbon-infused plate underfoot. Built for tempo days and easy miles alike.",
      variants: [
        { sku: "STR-AR-BLK-09", name: "Black / UK 9",  pricePaise: 899900, compareAtPaise: 1099900, onHand: 28, isDefault: true,
          attrs: [{ code: "color", value: "black" }, { code: "size", value: "uk-9" }] },
        { sku: "STR-AR-BLK-10", name: "Black / UK 10", pricePaise: 899900, compareAtPaise: 1099900, onHand: 16,
          attrs: [{ code: "color", value: "black" }, { code: "size", value: "uk-10" }] },
        { sku: "STR-AR-WHT-09", name: "White / UK 9",  pricePaise: 899900, onHand: 12,
          attrs: [{ code: "color", value: "white" }, { code: "size", value: "uk-9" }] },
        { sku: "STR-AR-WHT-10", name: "White / UK 10", pricePaise: 899900, onHand: 10,
          attrs: [{ code: "color", value: "white" }, { code: "size", value: "uk-10" }] },
      ],
      media: [
        { url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200", alt: "Aero Runner side view" },
        { url: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=1200", alt: "Aero Runner detail" },
      ],
      specs: [
        { key: "Weight", value: "245g (UK 9)" },
        { key: "Drop", value: "8mm" },
        { key: "Use", value: "Daily / Tempo" },
      ],
    },
    {
      slug: "stride-court-low",
      name: "Stride Court Low",
      brand: "stride", category: "sneakers",
      short: "Minimal court silhouette in full-grain leather.",
      long: "Heritage court lines, modern construction. Cup-sole, padded collar, and a clean toe box.",
      variants: [
        { sku: "STR-CL-WHT-08", name: "White / UK 8",  pricePaise: 649900, onHand: 22, isDefault: true,
          attrs: [{ code: "color", value: "white" }, { code: "size", value: "uk-8" }] },
        { sku: "STR-CL-WHT-09", name: "White / UK 9",  pricePaise: 649900, onHand: 18,
          attrs: [{ code: "color", value: "white" }, { code: "size", value: "uk-9" }] },
        { sku: "STR-CL-WHT-10", name: "White / UK 10", pricePaise: 649900, onHand: 14,
          attrs: [{ code: "color", value: "white" }, { code: "size", value: "uk-10" }] },
      ],
      media: [
        { url: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1200", alt: "Court Low front" },
      ],
      specs: [
        { key: "Upper", value: "Full-grain leather" },
        { key: "Sole", value: "Vulcanized rubber cup" },
      ],
    },
    {
      slug: "horizon-meridian-auto",
      name: "Horizon Meridian Automatic",
      brand: "horizon", category: "watches", featured: true,
      short: "Sapphire crystal, 41mm, in-house automatic movement.",
      long: "A 41mm field watch with brushed steel case, anti-reflective sapphire, and a Swiss-grade automatic caliber rated for 80h reserve.",
      variants: [
        { sku: "HRZ-MER-SLV-BLK", name: "Silver case / Black strap",  pricePaise: 4999900, onHand: 9, isDefault: true,
          attrs: [{ code: "case-color", value: "silver" }, { code: "strap-color", value: "black" }] },
        { sku: "HRZ-MER-SLV-TAN", name: "Silver case / Tan strap",    pricePaise: 4999900, onHand: 6,
          attrs: [{ code: "case-color", value: "silver" }, { code: "strap-color", value: "tan" }] },
        { sku: "HRZ-MER-GRP-BLK", name: "Graphite case / Black strap", pricePaise: 5499900, onHand: 4,
          attrs: [{ code: "case-color", value: "graphite" }, { code: "strap-color", value: "black" }] },
      ],
      media: [
        { url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200", alt: "Meridian Automatic" },
        { url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=1200", alt: "Meridian on wrist" },
      ],
      specs: [
        { key: "Case", value: "41mm brushed steel" },
        { key: "Crystal", value: "Sapphire, AR-coated" },
        { key: "Movement", value: "Automatic, 80h reserve" },
        { key: "Water resistance", value: "100m" },
      ],
    },
    {
      slug: "horizon-arc-quartz",
      name: "Horizon Arc Quartz",
      brand: "horizon", category: "watches",
      short: "38mm everyday quartz with a slim profile.",
      long: "Lightweight, accurate, and unfussy. Designed to disappear on the wrist when you need it to.",
      variants: [
        { sku: "HRZ-ARC-SLV-BLK", name: "Silver / Black strap", pricePaise: 1499900, onHand: 30, isDefault: true,
          attrs: [{ code: "case-color", value: "silver" }, { code: "strap-color", value: "black" }] },
        { sku: "HRZ-ARC-GLD-TAN", name: "Gold / Tan strap",     pricePaise: 1799900, onHand: 18,
          attrs: [{ code: "case-color", value: "gold" }, { code: "strap-color", value: "tan" }] },
      ],
      media: [
        { url: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=1200", alt: "Arc Quartz" },
      ],
      specs: [
        { key: "Case", value: "38mm" },
        { key: "Movement", value: "Quartz" },
      ],
    },
    {
      slug: "wavefront-aura-overear",
      name: "Wavefront Aura Over-ear",
      brand: "wavefront", category: "headphones", featured: true,
      short: "Wireless over-ear with adaptive noise cancellation.",
      long: "Custom 40mm dynamic drivers, 60h battery, and an ANC system tuned for travel and open-plan offices alike.",
      variants: [
        { sku: "WVF-AUR-BLK", name: "Black",  pricePaise: 2999900, compareAtPaise: 3499900, onHand: 24, isDefault: true,
          attrs: [{ code: "color", value: "black" }, { code: "form-factor", value: "over-ear" }, { code: "connectivity", value: "wireless" }] },
        { sku: "WVF-AUR-SLV", name: "Silver", pricePaise: 2999900, compareAtPaise: 3499900, onHand: 16,
          attrs: [{ code: "color", value: "silver" }, { code: "form-factor", value: "over-ear" }, { code: "connectivity", value: "wireless" }] },
        { sku: "WVF-AUR-NVY", name: "Navy",   pricePaise: 2999900, onHand: 9,
          attrs: [{ code: "color", value: "navy" }, { code: "form-factor", value: "over-ear" }, { code: "connectivity", value: "wireless" }] },
      ],
      media: [
        { url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200", alt: "Aura over-ear" },
        { url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1200", alt: "Aura on stand" },
      ],
      specs: [
        { key: "Drivers", value: "40mm dynamic" },
        { key: "Battery", value: "60h (ANC off), 40h (ANC on)" },
        { key: "Codec", value: "AAC, LDAC, aptX Adaptive" },
      ],
    },
    {
      slug: "wavefront-pulse-inear",
      name: "Wavefront Pulse In-ear",
      brand: "wavefront", category: "headphones",
      short: "True wireless in-ear, IPX5, 30h total runtime.",
      long: "A pocketable case, three ear-tip sizes, and instant pairing. Tuned for vocals without losing low-end punch.",
      variants: [
        { sku: "WVF-PLS-BLK", name: "Black", pricePaise: 999900, onHand: 40, isDefault: true,
          attrs: [{ code: "color", value: "black" }, { code: "form-factor", value: "in-ear" }, { code: "connectivity", value: "wireless" }] },
        { sku: "WVF-PLS-WHT", name: "White", pricePaise: 999900, onHand: 32,
          attrs: [{ code: "color", value: "white" }, { code: "form-factor", value: "in-ear" }, { code: "connectivity", value: "wireless" }] },
      ],
      media: [
        { url: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=1200", alt: "Pulse in-ear" },
      ],
      specs: [
        { key: "Battery", value: "8h buds, 30h with case" },
        { key: "Water resistance", value: "IPX5" },
      ],
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { vendorId_slug: { vendorId, slug: p.slug } },
      update: {
        name: p.name,
        shortDescription: p.short,
        description: p.long,
        brandId: brands[p.brand]!,
        status: "ACTIVE",
        isFeatured: p.featured ?? false,
        hasVariants: p.variants.length > 1,
      },
      create: {
        vendorId,
        slug: p.slug,
        name: p.name,
        shortDescription: p.short,
        description: p.long,
        brandId: brands[p.brand]!,
        status: "ACTIVE",
        isFeatured: p.featured ?? false,
        hasVariants: p.variants.length > 1,
        kind: "PHYSICAL",
      },
    });

    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: categories[p.category]! } },
      update: {},
      create: { productId: product.id, categoryId: categories[p.category]!, position: 0 },
    });

    // Media
    await prisma.productMedia.deleteMany({ where: { productId: product.id } });
    for (let i = 0; i < p.media.length; i++) {
      const m = p.media[i]!;
      await prisma.productMedia.create({
        data: { productId: product.id, url: m.url, altText: m.alt, position: i, isPrimary: i === 0 },
      });
    }

    // Specs
    await prisma.specification.deleteMany({ where: { productId: product.id } });
    for (let i = 0; i < p.specs.length; i++) {
      const s = p.specs[i]!;
      await prisma.specification.create({
        data: { productId: product.id, key: s.key, value: s.value, position: i },
      });
    }

    // Variants
    let defaultVariantId: string | null = null;
    for (const v of p.variants) {
      const variant = await prisma.variant.upsert({
        where: { productId_sku: { productId: product.id, sku: v.sku } },
        update: { name: v.name, isDefault: v.isDefault ?? false },
        create: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          isDefault: v.isDefault ?? false,
        },
      });
      if (v.isDefault) defaultVariantId = variant.id;

      // Variant attributes (replace strategy)
      await prisma.variantAttributeValue.deleteMany({ where: { variantId: variant.id } });
      for (const a of v.attrs) {
        const valueId = attrs[a.code]?.values[a.value];
        if (!valueId) throw new Error(`unknown attr value: ${a.code}=${a.value}`);
        await prisma.variantAttributeValue.create({
          data: { variantId: variant.id, attributeValueId: valueId },
        });
      }

      // Price
      await prisma.price.upsert({
        where: { priceListId_variantId: { priceListId: priceList.id, variantId: variant.id } },
        update: {
          amountMinor: BigInt(v.pricePaise),
          compareAtAmountMinor: v.compareAtPaise ? BigInt(v.compareAtPaise) : null,
        },
        create: {
          priceListId: priceList.id,
          variantId: variant.id,
          amountMinor: BigInt(v.pricePaise),
          compareAtAmountMinor: v.compareAtPaise ? BigInt(v.compareAtPaise) : null,
          currency: "INR",
        },
      });

      // Inventory
      await prisma.inventoryLevel.upsert({
        where: { warehouseId_variantId: { warehouseId: warehouse.id, variantId: variant.id } },
        update: { onHand: v.onHand },
        create: { warehouseId: warehouse.id, variantId: variant.id, onHand: v.onHand },
      });
    }

    if (defaultVariantId) {
      await prisma.product.update({
        where: { id: product.id },
        data: { defaultVariantId },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
