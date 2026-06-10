export { prisma } from "./client.ts";
export type { Db } from "./client.ts";

export * from "./repositories/index.ts";

export type { Prisma } from "./generated/index.js";
export {
  PrismaClient,
  Prisma as PrismaTypes,
} from "./generated/index.js";
