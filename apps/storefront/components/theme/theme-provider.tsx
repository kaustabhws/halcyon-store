"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider. Defaults to system, persists choice in
 * localStorage under `ecom-theme`, and toggles the `.dark` class on
 * `<html>` so our shadcn CSS variables resolve to dark tokens.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="ecom-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
