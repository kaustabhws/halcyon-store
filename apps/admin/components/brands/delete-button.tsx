"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteBrandAction } from "@/lib/brand-actions";

export function DeleteBrandButton({
  brandId,
  name,
}: {
  brandId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function go() {
    if (!confirm(`Delete the "${name}" brand?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("brandId", brandId);
      const res = await deleteBrandAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(`Deleted ${name}`);
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={go}
      aria-label="Delete"
    >
      <Trash2 />
    </Button>
  );
}
