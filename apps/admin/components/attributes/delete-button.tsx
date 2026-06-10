"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAttributeAction } from "@/lib/attribute-actions";

export function DeleteAttributeButton({
  attributeId,
  name,
}: {
  attributeId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  function go() {
    if (!confirm(`Delete attribute "${name}"? Its values will go too.`)) return;
    setErr(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("attributeId", attributeId);
      const res = await deleteAttributeAction(fd);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
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
      {err ? <span className="text-xs text-destructive">{err}</span> : null}
    </div>
  );
}
