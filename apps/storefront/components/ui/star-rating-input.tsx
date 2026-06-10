"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Interactive 5-star input. Uses a hidden native input so it submits with
 * forms naturally. Hover state previews the rating; click commits.
 */
export function StarRatingInput({
  name,
  defaultValue = 0,
  required,
}: {
  name: string;
  defaultValue?: number;
  required?: boolean;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [hover, setHover] = React.useState(0);
  const display = hover || value;

  return (
    <div
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
      role="radiogroup"
      aria-label="Rating"
    >
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
        readOnly
      />
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onMouseEnter={() => setHover(n)}
            onClick={() => setValue(n)}
            className="rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            <Star
              className={cn(
                "h-7 w-7",
                filled
                  ? "fill-amber-500 stroke-amber-500"
                  : "fill-transparent stroke-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
        {value > 0 ? `${value} / 5` : "Tap to rate"}
      </span>
    </div>
  );
}
