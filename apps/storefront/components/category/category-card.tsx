import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export type CategoryCardData = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
};

/**
 * Collection/category tile used on the homepage collections row and the
 * full /categories index. Links through to the category's shop listing.
 */
export function CategoryCard({
  category,
  sizes = "(min-width: 768px) 33vw, 100vw",
}: {
  category: CategoryCardData;
  sizes?: string;
}) {
  return (
    <Link
      href={`/shop/${category.slug}`}
      className="group relative block aspect-4/5 overflow-hidden rounded-3xl bg-muted"
    >
      {category.imageUrl ? (
        <Image
          src={category.imageUrl}
          alt={category.name}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted to-background">
          <span className="font-display text-2xl italic text-muted-foreground">
            {category.name}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-6 bottom-6 text-white">
        {category.description ? (
          <p className="text-xs uppercase tracking-widest opacity-80">
            {category.description}
          </p>
        ) : null}
        <h3 className="mt-1 text-2xl font-semibold tracking-tight">
          {category.name}
        </h3>
        <span className="mt-3 inline-flex items-center gap-1 text-sm">
          Explore{" "}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
