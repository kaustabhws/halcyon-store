import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { reviewRepo } from "@/lib/db";
import { AccountReviews } from "@/components/reviews/account-reviews";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reviews" };

export default async function AccountReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/reviews");

  const [toReview, mine] = await Promise.all([
    reviewRepo.listReviewableItemsForCustomer(session.user.id),
    reviewRepo.listCustomerReviews(session.user.id),
  ]);

  return (
    <AccountReviews
      toReview={toReview.map((t) => ({
        productId: t.productId,
        productName: t.productName,
        productSlug: t.productSlug,
        primaryImageUrl: t.primaryImageUrl,
        purchasedAt: t.purchasedAt.toISOString(),
      }))}
      mine={mine.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        productSlug: r.productSlug,
        status: r.status,
        rating: r.rating,
        title: r.title,
        body: r.body,
        hasPendingEdit: r.hasPendingEdit,
        updatedAt: r.updatedAt.toISOString(),
        published: r.published
          ? {
              rating: r.published.rating,
              title: r.published.title,
              body: r.published.body,
              publishedAt: r.published.publishedAt.toISOString(),
            }
          : null,
      }))}
    />
  );
}
