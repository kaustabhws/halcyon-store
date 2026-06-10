"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { toggleWishlistAction } from "@/lib/wishlist-actions";
import { cn } from "@/lib/cn";

/**
 * Heart toggle that flips a product in/out of the customer's wishlist.
 * Optimistic UI: the heart fills immediately; if the action fails, we
 * revert and toast.
 *
 * Anonymous users see a sign-in nudge instead of silently failing.
 */
export function WishlistButton({
  productId,
  isAuthed,
  initialInWishlist,
  variant = "ghost",
  size = "icon",
  className,
}: {
  productId: string;
  isAuthed: boolean;
  initialInWishlist: boolean;
  variant?: "ghost" | "outline" | "solid";
  size?: "icon" | "sm";
  className?: string;
}) {
  const router = useRouter();
  const [inList, setInList] = React.useState(initialInWishlist);
  const [pending, startTransition] = React.useTransition();

  function toggle(e: React.MouseEvent) {
    // Don't navigate when this lives inside a <Link> card.
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthed) {
      toast.message("Sign in to save items", {
        action: { label: "Sign in", onClick: () => router.push("/login") },
      });
      return;
    }

    const next = !inList;
    setInList(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      const res = await toggleWishlistAction(fd);
      if (!res.ok) {
        setInList(!next);
        toast.error(res.error);
        return;
      }
      toast.success(next ? "Saved to wishlist" : "Removed from wishlist");
      router.refresh();
    });
  }

  const base =
    "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50";
  const variantClasses = {
    ghost:
      "bg-background/80 backdrop-blur-md hover:bg-background border border-transparent",
    outline:
      "border bg-background hover:bg-muted",
    solid:
      "bg-foreground text-background hover:opacity-90",
  }[variant];
  const sizeClasses =
    size === "sm" ? "h-9 px-3 gap-2 text-sm" : "h-9 w-9";

  return (
    <button
      type="button"
      aria-pressed={inList}
      aria-label={inList ? "Remove from wishlist" : "Save to wishlist"}
      onClick={toggle}
      disabled={pending}
      className={cn(base, variantClasses, sizeClasses, className)}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          inList
            ? "fill-rose-500 stroke-rose-500"
            : "fill-transparent stroke-current",
        )}
      />
      {size === "sm" ? (
        <span>{inList ? "Saved" : "Save"}</span>
      ) : null}
    </button>
  );
}
