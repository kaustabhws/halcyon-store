"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSpecificationAction,
  deleteSpecificationAction,
} from "@/lib/specification-actions";

type Spec = { id: string; key: string; value: string };

export function SpecificationsManager({
  productId,
  specifications,
}: {
  productId: string;
  specifications: Spec[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [key, setKey] = React.useState("");
  const [value, setValue] = React.useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("key", key.trim());
      fd.set("value", value.trim());
      const res = await addSpecificationAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        setKey("");
        setValue("");
        router.refresh();
      }
    });
  }

  function remove(specId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("specId", specId);
      fd.set("productId", productId);
      const res = await deleteSpecificationAction(fd);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {specifications.length > 0 ? (
        <ul className="divide-y">
          {specifications.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground">{s.key}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-sm">{s.value}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(s.id)}
                disabled={pending}
                aria-label={`Remove ${s.key}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No specifications yet. Add key-value pairs below.
        </p>
      )}

      <form onSubmit={add} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="spec-key" className="text-xs">
            Key
          </Label>
          <Input
            id="spec-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. Weight"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="spec-value" className="text-xs">
            Value
          </Label>
          <Input
            id="spec-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 280g"
            className="h-8 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending} className="h-8">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </form>
    </div>
  );
}
