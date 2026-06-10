"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, Trash2, Plus, Tag } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  addProductMediaAction,
  deleteProductMediaAction,
  setPrimaryMediaAction,
  setMediaAttributeValueAction,
  setProductImageAttributeAction,
  toggleUseVariantImagesAction,
} from "@/lib/media-actions";

type Media = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  attributeValueId: string | null;
};

type AttributeValueOption = {
  id: string;
  label: string;
  swatchHex: string | null;
};

type ImageAttribute = {
  id: string;
  label: string;
  values: AttributeValueOption[];
};

const SHARED_VALUE = "__shared";
const NO_ATTR = "__none";

export function ProductMediaManager({
  productId,
  media,
  imageAttributes,
  imageAttributeId,
  useVariantImages,
  cloudName,
  cloudinaryConfigured,
}: {
  productId: string;
  media: Media[];
  /** Attributes the admin can pick from to group images (used-in-product,
   * falling back to all attributes when the product has none yet). */
  imageAttributes: ImageAttribute[];
  imageAttributeId: string | null;
  useVariantImages: boolean;
  cloudName: string | null;
  cloudinaryConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const chosenAttribute = React.useMemo(
    () => imageAttributes.find((a) => a.id === imageAttributeId) ?? null,
    [imageAttributes, imageAttributeId],
  );
  const valueById = React.useMemo(() => {
    const m = new Map<string, AttributeValueOption>();
    if (chosenAttribute) for (const v of chosenAttribute.values) m.set(v.id, v);
    return m;
  }, [chosenAttribute]);

  function addFromUpload(url: string, publicId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("url", url);
      fd.set("cloudinaryId", publicId);
      const res = await addProductMediaAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function removeMedia(id: string) {
    if (!confirm("Remove this image?")) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mediaId", id);
      const res = await deleteProductMediaAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function makePrimary(id: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mediaId", id);
      const res = await setPrimaryMediaAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function setImageValue(mediaId: string, value: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mediaId", mediaId);
      fd.set("attributeValueId", value === SHARED_VALUE ? "" : value);
      const res = await setMediaAttributeValueAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function setImageAttribute(value: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("attributeId", value === NO_ATTR ? "" : value);
      const res = await setProductImageAttributeAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function toggleUseVariantImages(on: boolean) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("useVariantImages", on ? "true" : "false");
      const res = await toggleUseVariantImagesAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const canGroup = useVariantImages && imageAttributes.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="useVariantImages" className="text-sm">
              Per-attribute images
            </Label>
            <p className="text-xs text-muted-foreground">
              Group images by an attribute (e.g. Color). The storefront swaps
              the gallery as the customer changes that attribute.
            </p>
          </div>
          <Switch
            id="useVariantImages"
            checked={useVariantImages}
            onCheckedChange={toggleUseVariantImages}
            disabled={pending}
          />
        </div>

        {canGroup ? (
          <div className="space-y-1.5 border-t pt-3">
            <Label htmlFor="imageAttribute" className="text-xs">
              Group images by
            </Label>
            <Select
              value={imageAttributeId ?? NO_ATTR}
              onValueChange={setImageAttribute}
              disabled={pending}
            >
              <SelectTrigger id="imageAttribute" className="h-8 text-xs">
                <SelectValue placeholder="Choose an attribute…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ATTR}>Choose an attribute…</SelectItem>
                {imageAttributes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!chosenAttribute ? (
              <p className="text-xs text-muted-foreground">
                Pick the attribute whose values you want to show different
                images for, then tag each image below.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => {
            const tagged = m.attributeValueId
              ? valueById.get(m.attributeValueId)
              : null;
            return (
              <div
                key={m.id}
                className="group relative overflow-hidden rounded-md border bg-muted"
              >
                <div className="relative aspect-square">
                  <Image
                    src={m.url}
                    alt={m.altText ?? ""}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {m.isPrimary ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-foreground/90 px-1.5 py-0.5 text-[10px] font-medium text-background">
                      <Star className="h-2.5 w-2.5 fill-current" /> Primary
                    </span>
                  ) : null}
                  {chosenAttribute && tagged ? (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                      {tagged.swatchHex ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full border"
                          style={{ background: tagged.swatchHex }}
                        />
                      ) : (
                        <Tag className="h-2.5 w-2.5" />
                      )}
                      <span className="max-w-[10ch] truncate">{tagged.label}</span>
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-linear-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {!m.isPrimary ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => makePrimary(m.id)}
                        aria-label="Make primary"
                      >
                        <Star />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => removeMedia(m.id)}
                      aria-label="Remove"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                {chosenAttribute ? (
                  <div className="border-t p-2">
                    <Select
                      value={m.attributeValueId ?? SHARED_VALUE}
                      onValueChange={(v) => setImageValue(m.id, v)}
                      disabled={pending}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SHARED_VALUE}>
                          Shared (all {chosenAttribute.label.toLowerCase()})
                        </SelectItem>
                        {chosenAttribute.values.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="inline-flex items-center gap-2">
                              {v.swatchHex ? (
                                <span
                                  className="h-3 w-3 rounded-full border"
                                  style={{ background: v.swatchHex }}
                                />
                              ) : null}
                              {v.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {cloudinaryConfigured && cloudName ? (
        <CldUploadWidget
          signatureEndpoint="/api/cloudinary/sign"
          options={{
            cloudName,
            sources: ["local", "url", "camera"],
            multiple: true,
            folder: "ecom/products",
            maxFiles: 12,
            clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
            maxFileSize: 10 * 1024 * 1024,
          }}
          onSuccess={(result) => {
            const info = result?.info;
            if (info && typeof info !== "string" && "secure_url" in info && "public_id" in info) {
              addFromUpload(info.secure_url as string, info.public_id as string);
            }
          }}
        >
          {({ open }) => (
            <Button type="button" variant="outline" size="sm" onClick={() => open()}>
              <Plus /> Upload images
            </Button>
          )}
        </CldUploadWidget>
      ) : (
        <Alert>
          <AlertDescription className="text-xs">
            Cloudinary isn&rsquo;t configured — paste a URL below or set up
            Cloudinary keys to enable direct uploads.
          </AlertDescription>
        </Alert>
      )}

      <ManualUrlAdd
        productId={productId}
        pending={pending}
        setError={setError}
        onAdded={() => router.refresh()}
      />

      {chosenAttribute ? (
        <p className="text-xs text-muted-foreground">
          Tip: tag each image with the {chosenAttribute.label.toLowerCase()} it
          represents. Images left as &ldquo;Shared&rdquo; show for every{" "}
          {chosenAttribute.label.toLowerCase()} as a fallback.
        </p>
      ) : null}
    </div>
  );
}

function ManualUrlAdd({
  productId,
  pending,
  setError,
  onAdded,
}: {
  productId: string;
  pending: boolean;
  setError: (e: string | null) => void;
  onAdded: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        or add a URL manually
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        fd.set("productId", productId);
        setError(null);
        const res = await addProductMediaAction(fd);
        if (!res.ok) setError(res.error);
        else {
          formRef.current?.reset();
          setOpen(false);
          onAdded();
        }
      }}
      className="flex flex-wrap gap-2 rounded-md border p-3"
    >
      <input
        name="url"
        required
        placeholder="https://…"
        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
      />
      <input
        name="altText"
        placeholder="Alt text"
        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
      />
      <Button type="submit" size="sm" disabled={pending}>
        Add
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
