/**
 * Seed: platform vendor, RBAC, warehouse, price list, and a real demo catalog.
 *
 * Catalog data is generated into ./seed-data.json by gen-seed-data.mjs (real
 * products from DummyJSON + a few curated items). This script WIPES the
 * existing catalog + commerce data (carts, orders, reviews, wishlist) and
 * reseeds from scratch — it is destructive by design.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedData = {
  brands: { slug: string; name: string }[];
  parents: { slug: string; name: string; description: string; imageUrl: string | null; position: number }[];
  children: { slug: string; name: string; description: string; imageUrl: string | null; position: number; parent: string }[];
  attributes: { code: string; label: string; kind: "LIST" | "SWATCH"; values: { v: string; l: string; hex?: string }[] }[];
  products: {
    slug: string; name: string; brand: string | null; category: string;
    short: string; long: string; featured: boolean;
    media: { url: string; alt: string }[];
    specs: { key: string; value: string }[];
    variants: { sku: string; name: string; pricePaise: number; comparePaise?: number; onHand: number; attrs: { code: string; value: string }[]; isDefault?: boolean }[];
  }[];
  nav: { mode: string; items: { categorySlug: string; childSlugs: string[] }[] };
  hero: { design: string; productSlug: string };
};

const data: SeedData = JSON.parse(
  readFileSync(new URL("./seed-data.json", import.meta.url), "utf8"),
);

const SCOPE = "PLATFORM";

async function setSetting(key: string, value: unknown) {
  const existing = await prisma.setting.findFirst({
    where: { scope: SCOPE, vendorId: null, key },
  });
  if (existing) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value: value as never } });
  } else {
    await prisma.setting.create({ data: { scope: SCOPE, key, value: value as never } });
  }
}

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
  await wipeCatalog();
  await seedCatalog(vendor.id);

  console.log("seed complete.");
}

/**
 * Destructive reset of catalog + commerce data. Order matters: OrderItem and
 * CartItem reference Variant with no cascade, so they (and their parents) must
 * go before products. Everything else cascades from Product / Variant.
 */
async function wipeCatalog() {
  console.log("wiping catalog + commerce data...");
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.order.deleteMany({}); // cascades order items, timeline, fulfillments, shipments
  await prisma.product.deleteMany({}); // cascades variants, prices, inventory, media, specs, categories-join, reviews, wishlist
  await prisma.attribute.deleteMany({}); // cascades attribute values
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
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
    await prisma.role.upsert({ where: { name: r.name }, update: { description: r.description, isSystem: r.isSystem }, create: r });
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
    await prisma.permission.upsert({ where: { key: p.key }, update: { resource: p.resource, action: p.action }, create: p });
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
    create: { vendorId, code: "WH-MAIN", name: "Main Warehouse", city: "Bengaluru", state: "KA", country: "IN", isDefault: true },
  });
}

async function seedPriceList(vendorId: string) {
  await prisma.priceList.upsert({
    where: { vendorId_code: { vendorId, code: "DEFAULT" } },
    update: {},
    create: { vendorId, code: "DEFAULT", name: "Default Price List", currency: "INR", isDefault: true },
  });
}

async function seedCatalog(vendorId: string) {
  const warehouse = await prisma.warehouse.findFirstOrThrow({ where: { vendorId, isDefault: true } });
  const priceList = await prisma.priceList.findFirstOrThrow({ where: { vendorId, isDefault: true } });

  // Brands
  const brandId: Record<string, string> = {};
  for (const b of data.brands) {
    const row = await prisma.brand.create({ data: { vendorId, slug: b.slug, name: b.name } });
    brandId[b.slug] = row.id;
  }

  // Categories — parents first, then children (so parentId resolves).
  const catId: Record<string, string> = {};
  for (const c of data.parents) {
    const row = await prisma.category.create({
      data: { vendorId, slug: c.slug, name: c.name, description: c.description, imageUrl: c.imageUrl, position: c.position },
    });
    catId[c.slug] = row.id;
  }
  for (const c of data.children) {
    const row = await prisma.category.create({
      data: { vendorId, slug: c.slug, name: c.name, description: c.description, imageUrl: c.imageUrl, position: c.position, parentId: catId[c.parent]! },
    });
    catId[c.slug] = row.id;
  }

  // Attributes
  const attr: Record<string, { id: string; values: Record<string, string> }> = {};
  for (const def of data.attributes) {
    const a = await prisma.attribute.create({ data: { vendorId, code: def.code, label: def.label, kind: def.kind } });
    const values: Record<string, string> = {};
    for (let i = 0; i < def.values.length; i++) {
      const dv = def.values[i]!;
      const av = await prisma.attributeValue.create({
        data: { attributeId: a.id, value: dv.v, label: dv.l, swatchHex: dv.hex ?? null, position: i },
      });
      values[dv.v] = av.id;
    }
    attr[def.code] = { id: a.id, values };
  }

  // Products
  for (const p of data.products) {
    const product = await prisma.product.create({
      data: {
        vendorId,
        slug: p.slug,
        name: p.name,
        shortDescription: p.short,
        description: p.long,
        brandId: p.brand ? brandId[data.brands.find((b) => b.name === p.brand)!.slug] : null,
        status: "ACTIVE",
        isFeatured: p.featured,
        hasVariants: p.variants.length > 1,
        kind: "PHYSICAL",
      },
    });

    await prisma.productCategory.create({
      data: { productId: product.id, categoryId: catId[p.category]!, position: 0 },
    });

    for (let i = 0; i < p.media.length; i++) {
      const m = p.media[i]!;
      await prisma.productMedia.create({
        data: { productId: product.id, url: m.url, altText: m.alt, position: i, isPrimary: i === 0 },
      });
    }

    for (let i = 0; i < p.specs.length; i++) {
      const s = p.specs[i]!;
      await prisma.specification.create({ data: { productId: product.id, key: s.key, value: s.value, position: i } });
    }

    let defaultVariantId: string | null = null;
    for (const v of p.variants) {
      const variant = await prisma.variant.create({
        data: { productId: product.id, sku: v.sku, name: v.name, isDefault: v.isDefault ?? false },
      });
      if (v.isDefault) defaultVariantId = variant.id;

      for (const a of v.attrs) {
        const valueId = attr[a.code]?.values[a.value];
        if (!valueId) throw new Error(`unknown attr value: ${a.code}=${a.value}`);
        await prisma.variantAttributeValue.create({ data: { variantId: variant.id, attributeValueId: valueId } });
      }

      await prisma.price.create({
        data: {
          priceListId: priceList.id,
          variantId: variant.id,
          amountMinor: BigInt(v.pricePaise),
          compareAtAmountMinor: v.comparePaise ? BigInt(v.comparePaise) : null,
          currency: "INR",
        },
      });

      await prisma.inventoryLevel.create({
        data: { warehouseId: warehouse.id, variantId: variant.id, onHand: v.onHand },
      });
    }

    if (defaultVariantId) {
      await prisma.product.update({ where: { id: product.id }, data: { defaultVariantId } });
    } else {
      // Single-variant products: default to the first.
      const first = await prisma.variant.findFirstOrThrow({ where: { productId: product.id } });
      await prisma.product.update({ where: { id: product.id }, data: { defaultVariantId: first.id } });
    }
  }

  // Storefront navigation (mega menu over the new tree).
  await setSetting("storefront.nav", {
    mode: data.nav.mode,
    items: data.nav.items.map((it) => ({
      categoryId: catId[it.categorySlug]!,
      childIds: it.childSlugs.map((s) => catId[s]!),
    })),
  });

  // Homepage hero — prefer a visually strong product.
  const heroSlug =
    data.products.find((p) => p.slug.includes("nike-air-jordan"))?.slug ?? data.hero.productSlug;
  const hero = await prisma.product.findFirstOrThrow({ where: { vendorId, slug: heroSlug } });
  await setSetting("homepage.heroDesign", data.hero.design);
  await setSetting("homepage.heroProductId", hero.id);

  console.log(`seeded ${data.products.length} products across ${data.parents.length} sections.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
