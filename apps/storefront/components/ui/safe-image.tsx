"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Image with a soft fallback when the source 404s or omits a URL. Use for
 * any place a product image might be missing — listing cards, cart line
 * items, PDP gallery thumbnails.
 *
 * Behaves like next/image for valid sources; falls back to a muted
 * placeholder with a faint icon otherwise.
 */
export function SafeImage({
  src,
  alt,
  className,
  fallbackClassName,
  ...rest
}: Omit<ImageProps, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [errored, setErrored] = React.useState(false);

  if (!src || errored) {
    return (
      <div
        className={cn(
          "grid h-full w-full place-items-center bg-muted text-muted-foreground",
          fallbackClassName,
        )}
        aria-hidden={!alt}
      >
        <ImageOff className="h-5 w-5 opacity-50" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
