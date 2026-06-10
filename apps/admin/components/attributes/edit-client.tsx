"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
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
import {
  updateAttributeAction,
  addAttributeValueAction,
  deleteAttributeValueAction,
  type AttributeFormState,
} from "@/lib/attribute-actions";

type AttrValue = {
  id: string;
  value: string;
  label: string;
  swatchHex: string | null;
  position: number;
};

export function EditAttributeClient({
  attribute,
  values,
}: {
  attribute: {
    id: string;
    code: string;
    label: string;
    kind: "LIST" | "TEXT" | "NUMBER" | "SWATCH";
  };
  values: AttrValue[];
}) {
  const [state, action, pending] = useActionState<AttributeFormState | undefined, FormData>(
    updateAttributeAction,
    undefined,
  );

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4 rounded-xl border bg-card p-6">
        <input type="hidden" name="attributeId" value={attribute.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" defaultValue={attribute.label} required />
            {state?.fieldErrors?.label ? (
              <p className="text-xs text-destructive">{state.fieldErrors.label[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" defaultValue={attribute.code} required />
            {state?.fieldErrors?.code ? (
              <p className="text-xs text-destructive">{state.fieldErrors.code[0]}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kind">Kind</Label>
          <Select name="kind" defaultValue={attribute.kind}>
            <SelectTrigger id="kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LIST">List</SelectItem>
              <SelectItem value="SWATCH">Swatch</SelectItem>
              <SelectItem value="TEXT">Text</SelectItem>
              <SelectItem value="NUMBER">Number</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {state?.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : state?.ok ? (
          <Alert>
            <AlertDescription>Saved.</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <ValuesEditor
        attributeId={attribute.id}
        kind={attribute.kind}
        initialValues={values}
      />
    </div>
  );
}

function ValuesEditor({
  attributeId,
  kind,
  initialValues,
}: {
  attributeId: string;
  kind: "LIST" | "TEXT" | "NUMBER" | "SWATCH";
  initialValues: AttrValue[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const showSwatch = kind === "SWATCH";

  async function add(formData: FormData) {
    setErr(null);
    formData.set("attributeId", attributeId);
    startTransition(async () => {
      const res = await addAttributeValueAction(formData);
      if (!res.ok) setErr(res.error);
      else {
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  function remove(valueId: string, label: string) {
    if (!confirm(`Delete value "${label}"?`)) return;
    setErr(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("valueId", valueId);
      const res = await deleteAttributeValueAction(fd);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <header>
        <h2 className="text-base font-semibold tracking-tight">Values</h2>
        <p className="text-sm text-muted-foreground">
          The options variants can pick from for this attribute.
        </p>
      </header>

      <ul className="divide-y rounded-md border">
        {initialValues.map((v) => (
          <li key={v.id} className="flex items-center gap-3 px-3 py-2">
            {v.swatchHex ? (
              <span
                className="h-5 w-5 rounded-full border"
                style={{ background: v.swatchHex }}
                aria-hidden
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{v.label}</p>
              <p className="font-mono text-xs text-muted-foreground">{v.value}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              onClick={() => remove(v.id, v.label)}
              aria-label="Delete"
            >
              <Trash2 />
            </Button>
          </li>
        ))}
        {initialValues.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            No values yet. Add one below.
          </li>
        ) : null}
      </ul>

      <form
        ref={formRef}
        action={add}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div className="space-y-1.5">
          <Label htmlFor="value">Value</Label>
          <Input
            id="value"
            name="value"
            placeholder="black"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" placeholder="Black" required />
        </div>
        {showSwatch ? (
          <div className="space-y-1.5">
            <Label htmlFor="swatchHex">Hex</Label>
            <Input
              id="swatchHex"
              name="swatchHex"
              placeholder="#0a0a0a"
              pattern="^#[0-9a-fA-F]{6}$"
            />
          </div>
        ) : null}
        <div className="flex items-end sm:col-start-3">
          <Button type="submit" size="sm" disabled={pending}>
            <Plus /> Add
          </Button>
        </div>
      </form>

      {err ? (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
