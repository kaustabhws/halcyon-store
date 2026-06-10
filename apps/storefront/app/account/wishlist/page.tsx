import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { wishlistRepo } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { formatPrice, discountPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/wishlist");

  const items = await wishlistRepo.listWishlist(session.user.id);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/40 p-12 text-center">
        <h2 className="font-display text-2xl tracking-tight">
          Nothing saved yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the heart on anything you like — we&rsquo;ll keep it here.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse the shelf</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Wishlist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} saved.
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const off = discountPercent(item.priceMinor, item.compareAtMinor);
          return (
            <li
              key={item.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-muted"
            >
              <Link
                href={`/product/${item.productSlug}`}
                className="relative aspect-4/5 w-full overflow-hidden bg-muted"
              >
                {item.primaryImageUrl ? (
                  <Image
                    src={item.primaryImageUrl}
                    alt={item.productName}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : null}
                {off ? (
                  <Badge
                    variant="accent"
                    className="absolute left-3 top-3 text-[10px] tracking-widest"
                  >
                    {off}% OFF
                  </Badge>
                ) : null}
                {!item.inStock ? (
                  <Badge
                    variant="outline"
                    className="absolute right-3 top-3 bg-background/80"
                  >
                    Sold out
                  </Badge>
                ) : null}
              </Link>
              <div className="absolute right-3 top-3">
                <WishlistButton
                  productId={item.productId}
                  isAuthed
                  initialInWishlist
                />
              </div>
              <div className="flex flex-col gap-1 p-4">
                {item.brandName ? (
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {item.brandName}
                  </p>
                ) : null}
                <Link
                  href={`/product/${item.productSlug}`}
                  className="text-sm font-medium leading-snug hover:underline"
                >
                  {item.productName}
                </Link>
                <p className="mt-1 text-sm font-semibold">
                  {formatPrice(item.priceMinor, item.currency)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
