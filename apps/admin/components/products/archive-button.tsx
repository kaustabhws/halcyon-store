"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveProductAction } from "@/lib/product-actions";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function go() {
    if (!confirm("Archive this product? It'll be hidden from the storefront.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      const res = await archiveProductAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Product archived");
        router.push("/products");
      }
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={go}>
      {pending ? "Archiving…" : "Archive"}
    </Button>
  );
}
