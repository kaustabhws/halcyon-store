import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __ecom_prisma__: PrismaClient | undefined;
}

function build(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  }).$extends({
    name: "soft-delete",
    query: {
      // Models with a `deletedAt` column. Listed explicitly so adding the
      // column to a new model is a deliberate choice.
      $allModels: {
        async findMany({ model, args, query }) {
          if (HAS_SOFT_DELETE.has(model) && !("deletedAt" in (args.where ?? {}))) {
            args.where = { ...(args.where ?? {}), deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (HAS_SOFT_DELETE.has(model) && !("deletedAt" in (args.where ?? {}))) {
            args.where = { ...(args.where ?? {}), deletedAt: null };
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (HAS_SOFT_DELETE.has(model) && !("deletedAt" in (args.where ?? {}))) {
            args.where = { ...(args.where ?? {}), deletedAt: null };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (HAS_SOFT_DELETE.has(model) && !("deletedAt" in (args.where ?? {}))) {
            args.where = { ...(args.where ?? {}), deletedAt: null };
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

const HAS_SOFT_DELETE = new Set([
  "Customer",
  "Address",
  "Admin",
  "Vendor",
  "Category",
  "Brand",
  "Product",
  "Variant",
  "Warehouse",
  "PriceList",
  "Coupon",
  "Order",
  "Review",
]);

export const prisma: PrismaClient =
  globalThis.__ecom_prisma__ ?? build();

if (process.env.NODE_ENV !== "production") {
  globalThis.__ecom_prisma__ = prisma;
}

export type Db = typeof prisma;
