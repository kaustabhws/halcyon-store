import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Display-only star rating. Renders 5 stars filled to the given fraction,
 * with a partial fill via CSS `clip-path` for accuracy. Use `interactive`
 * for the form input; this is read-only.
 */
export function StarRating({
  value,
  outOf = 5,
  size = "sm",
  className,
}: {
  value: number;
  outOf?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "xs"
      ? "h-3 w-3"
      : size === "sm"
        ? "h-3.5 w-3.5"
        : size === "md"
          ? "h-4 w-4"
          : "h-5 w-5";

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Rated ${value.toFixed(1)} out of ${outOf}`}
    >
      {Array.from({ length: outOf }).map((_, i) => {
        const filledFraction = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={cn("relative", sizeClass)}>
            <Star className={cn(sizeClass, "stroke-amber-500/40 fill-amber-500/0")} />
            {filledFraction > 0 ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${filledFraction * 100}%` }}
                aria-hidden
              >
                <Star className={cn(sizeClass, "stroke-amber-500 fill-amber-500")} />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
