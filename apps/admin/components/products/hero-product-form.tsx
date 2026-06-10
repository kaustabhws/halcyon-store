"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setHeroProductAction } from "@/lib/featured-actions";

type ProductOption = {
  id: string;
  name: string;
  brandName: string | null;
};

const NONE_VALUE = "__none__";

export function HeroProductForm({
  products,
  currentHeroId,
}: {
  products: ProductOption[];
  currentHeroId: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(currentHeroId || NONE_VALUE);
  const [pending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", value === NONE_VALUE ? "" : value);
      const res = await setHeroProductAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Hero product updated");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="No hero product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None (text-only hero)</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.brandName ? ` — ${p.brandName}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
