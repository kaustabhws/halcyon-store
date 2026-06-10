"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createAttributeAction, type AttributeFormState } from "@/lib/attribute-actions";

export function NewAttributeForm() {
  const [state, action, pending] = useActionState<AttributeFormState | undefined, FormData>(
    createAttributeAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" required placeholder="e.g. Color, Size" />
          {state?.fieldErrors?.label ? (
            <p className="text-xs text-destructive">{state.fieldErrors.label[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" required placeholder="color" />
          {state?.fieldErrors?.code ? (
            <p className="text-xs text-destructive">{state.fieldErrors.code[0]}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Lowercase identifier used in URLs and APIs.
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kind">Kind</Label>
        <Select name="kind" defaultValue="LIST">
          <SelectTrigger id="kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LIST">List (e.g. Size: UK 7, UK 8…)</SelectItem>
            <SelectItem value="SWATCH">Swatch (e.g. Color with hex)</SelectItem>
            <SelectItem value="TEXT">Free text</SelectItem>
            <SelectItem value="NUMBER">Number</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create attribute"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/attributes">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
