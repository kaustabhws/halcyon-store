import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class merger. Use everywhere we conditionally compose class lists.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
