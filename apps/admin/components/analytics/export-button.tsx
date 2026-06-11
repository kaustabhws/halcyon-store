"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = Record<string, string | number>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h] ?? "")).join(","));
  return lines.join("\n");
}

/** Client-side CSV download of an already-prepared row set. */
export function ExportButton({ filename, rows }: { filename: string; rows: Row[] }) {
  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={download}
      disabled={rows.length === 0}
    >
      <Download className="h-3.5 w-3.5" /> Export
    </Button>
  );
}
