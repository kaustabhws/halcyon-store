"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea, FieldError } from "@/components/ui/form";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from "@/lib/category-actions";

type Mode =
  | { mode: "create" }
  | {
      mode: "edit";
      categoryId: string;
      defaults: {
        name: string;
        slug: string;
        description: string | null;
        imageUrl: string | null;
        position: number;
      };
    };

export function CategoryForm({ state }: { state: Mode }) {
  const isEdit = state.mode === "edit";
  const [formState, formAction, pending] = useActionState<CategoryFormState | undefined, FormData>(
    isEdit ? updateCategoryAction : createCategoryAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-zinc-200 bg-background p-5 dark:border-zinc-800">
      {isEdit ? <input type="hidden" name="categoryId" value={state.categoryId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={isEdit ? state.defaults.name : ""}
            className="mt-1.5"
          />
          <FieldError messages={formState?.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            required
            defaultValue={isEdit ? state.defaults.slug : ""}
            placeholder="lowercase-with-dashes"
            className="mt-1.5"
          />
          <FieldError messages={formState?.fieldErrors?.slug} />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={isEdit ? state.defaults.description ?? "" : ""}
          className="mt-1.5"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="imageUrl">Image URL (optional)</Label>
          <Input
            id="imageUrl"
            name="imageUrl"
            type="url"
            defaultValue={isEdit ? state.defaults.imageUrl ?? "" : ""}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            name="position"
            type="number"
            min={0}
            step={1}
            defaultValue={isEdit ? state.defaults.position : 0}
            className="mt-1.5"
          />
        </div>
      </div>

      {formState?.error ? (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{formState.error}</p>
      ) : formState?.ok ? (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
