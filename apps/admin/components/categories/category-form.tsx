"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea, FieldError } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/media/image-uploader";
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
        parentId: string | null;
        position: number;
      };
    };

const NO_PARENT = "__none__";

export function CategoryForm({
  state,
  cloudinary,
  parentOptions,
}: {
  state: Mode;
  cloudinary: { cloudName: string | null; apiKey: string | null; configured: boolean };
  parentOptions: { id: string; name: string }[];
}) {
  const isEdit = state.mode === "edit";
  const [formState, formAction, pending] = useActionState<CategoryFormState | undefined, FormData>(
    isEdit ? updateCategoryAction : createCategoryAction,
    undefined,
  );
  const [imageUrl, setImageUrl] = useState<string>(
    isEdit ? state.defaults.imageUrl ?? "" : "",
  );
  const [parentId, setParentId] = useState<string>(
    isEdit ? state.defaults.parentId ?? "" : "",
  );

  // A category can't be its own parent; hide it from the options when editing.
  const options = parentOptions.filter(
    (o) => !(isEdit && o.id === state.categoryId),
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
      <div>
        <Label>Image</Label>
        <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
          Shown on the storefront homepage collections. Required.
        </p>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <ImageUploader
          cloudName={cloudinary.cloudName}
          apiKey={cloudinary.apiKey}
          configured={cloudinary.configured}
          folder="ecom/categories"
          value={imageUrl || null}
          onUploaded={(img) => setImageUrl(img.url)}
          onClear={() => setImageUrl("")}
        />
        <FieldError messages={formState?.fieldErrors?.imageUrl} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="parentId">Parent category</Label>
          <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
            Optional. Nest this under a top-level category (max 2 levels).
          </p>
          <input type="hidden" name="parentId" value={parentId} />
          <Select
            value={parentId || NO_PARENT}
            onValueChange={(v) => setParentId(v === NO_PARENT ? "" : v)}
          >
            <SelectTrigger id="parentId" className="w-full">
              <SelectValue placeholder="None (top-level)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>None (top-level)</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={formState?.fieldErrors?.parentId} />
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
        <Button type="submit" disabled={pending || !imageUrl}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
