"use client";

import * as React from "react";
import Image from "next/image";
import { UploadCloud, Link2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type UploadedImage = {
  url: string;
  publicId: string | null;
};

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif"];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Sign + direct-upload one file to Cloudinary. We ask our own
 * /api/cloudinary/sign endpoint to sign `{folder, timestamp}` with the
 * private secret, then PUT the bytes straight to Cloudinary (never proxied
 * through our server). XHR is used so we can surface upload progress.
 */
function uploadToCloudinary(
  file: File,
  opts: { cloudName: string; apiKey: string; folder: string },
  onProgress: (pct: number) => void,
): Promise<UploadedImage> {
  return new Promise(async (resolve, reject) => {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { folder: opts.folder, timestamp };

    let signature: string;
    try {
      const res = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not sign upload");
      }
      signature = (await res.json()).signature;
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Could not sign upload"));
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", opts.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", opts.folder);
    form.append("signature", signature);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${opts.cloudName}/image/upload`,
    );
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const info = JSON.parse(xhr.responseText);
        resolve({ url: info.secure_url, publicId: info.public_id });
      } else {
        let msg = "Upload failed";
        try {
          msg = JSON.parse(xhr.responseText)?.error?.message ?? msg;
        } catch {
          /* keep default */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

function validateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) {
    return "Use a PNG, JPG, WebP or AVIF image.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 10 MB or smaller.";
  }
  return null;
}

/**
 * Reusable image picker built from shadcn primitives. Two tabs: drag/drop
 * (or click) upload straight to Cloudinary, or paste an existing image URL.
 * Calls `onUploaded` once per accepted image. `multiple` allows several
 * files per drop (used by the product media manager); single mode replaces
 * the current value (used by category/brand forms).
 */
export function ImageUploader({
  cloudName,
  apiKey,
  configured,
  folder = "ecom/products",
  multiple = false,
  value,
  onUploaded,
  onClear,
}: {
  cloudName: string | null;
  apiKey: string | null;
  configured: boolean;
  folder?: string;
  multiple?: boolean;
  value?: string | null;
  onUploaded: (image: UploadedImage) => void;
  onClear?: () => void;
}) {
  const [tab, setTab] = React.useState<string>(configured ? "upload" : "url");
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [urlValue, setUrlValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const canUpload = configured && Boolean(cloudName) && Boolean(apiKey);

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      const picked = multiple ? list : list.slice(0, 1);

      setError(null);
      setBusy(true);
      try {
        for (const file of picked) {
          const invalid = validateFile(file);
          if (invalid) {
            setError(invalid);
            continue;
          }
          setProgress(0);
          const img = await uploadToCloudinary(
            file,
            { cloudName: cloudName!, apiKey: apiKey!, folder },
            setProgress,
          );
          onUploaded(img);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [apiKey, cloudName, folder, multiple, onUploaded],
  );

  const submitUrl = () => {
    const trimmed = urlValue.trim();
    if (!trimmed) {
      setError("Enter an image URL.");
      return;
    }
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        throw new Error("bad protocol");
      }
    } catch {
      setError("Enter a valid http(s) URL.");
      return;
    }
    setError(null);
    onUploaded({ url: trimmed, publicId: null });
    setUrlValue("");
  };

  return (
    <div className="space-y-3">
      {!multiple && value ? (
        <div className="flex items-center gap-3 rounded-md border p-2">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image src={value} alt="Selected" fill sizes="64px" className="object-cover" />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{value}</p>
          {onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                onClear();
                setError(null);
              }}
              aria-label="Remove image"
            >
              <X />
            </Button>
          ) : null}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" disabled={!canUpload} className="flex-1">
            <UploadCloud /> Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="flex-1">
            <Link2 /> Paste URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          {canUpload ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => !busy && inputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !busy) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!busy && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                dragOver ? "border-ring bg-accent" : "border-input hover:bg-accent/50",
                busy && "pointer-events-none opacity-70",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Uploading… {progress}%</p>
                  <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">Click to upload</span> or drag &amp; drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WebP or AVIF · up to 10 MB{multiple ? " · multiple allowed" : ""}
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED.join(",")}
                multiple={multiple}
                hidden
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          ) : (
            <Alert>
              <AlertDescription className="text-xs">
                Cloudinary isn&rsquo;t configured. Add{" "}
                <code className="rounded bg-muted px-1">CLOUDINARY_CLOUD_NAME</code>,{" "}
                <code className="rounded bg-muted px-1">CLOUDINARY_API_KEY</code>, and{" "}
                <code className="rounded bg-muted px-1">CLOUDINARY_API_SECRET</code> to enable
                direct uploads — or paste an image URL instead.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="url" className="mt-3">
          <div className="flex flex-wrap gap-2">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitUrl();
                }
              }}
              className="min-w-0 flex-1"
            />
            <Button type="button" variant="outline" onClick={submitUrl}>
              {multiple ? "Add" : "Use URL"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {error ? (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
