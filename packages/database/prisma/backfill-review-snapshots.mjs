/**
 * One-time backfill: for every already-APPROVED review, copy the working copy
 * (rating/title/body) into the published snapshot so the PDP (which now reads
 * publishedAt/published* instead of status) keeps showing them.
 *
 * Idempotent: only touches APPROVED rows whose publishedAt is still null.
 * Run once: node prisma/backfill-review-snapshots.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.review.findMany({
    where: { status: "APPROVED", publishedAt: null, deletedAt: null },
    select: { id: true, rating: true, title: true, body: true, updatedAt: true },
  });

  console.log(`Found ${rows.length} approved review(s) to backfill.`);

  for (const r of rows) {
    await prisma.review.update({
      where: { id: r.id },
      data: {
        publishedRating: r.rating,
        publishedTitle: r.title,
        publishedBody: r.body,
        publishedAt: r.updatedAt,
      },
    });
    console.log(`  ✓ snapshotted ${r.id}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
