"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type UploadedImage = {
  url: string;
  publicId: string;
};

/**
 * Wrapper around Cloudinary's upload widget. Cloud name must be passed in
 * (we read it on the server and inject as a prop). Signing happens through
 * our /api/cloudinary/sign endpoint.
 */
export function CloudinaryUploader({
  cloudName,
  configured,
  onUploaded,
  value,
  multiple = false,
  buttonLabel = "Upload image",
}: {
  cloudName: string | null;
  configured: boolean;
  onUploaded: (image: UploadedImage) => void;
  value?: UploadedImage | null;
  multiple?: boolean;
  buttonLabel?: string;
}) {
  if (!configured || !cloudName) {
    return (
      <Alert variant="default">
        <AlertDescription className="text-xs">
          Cloudinary isn&rsquo;t configured. Add{" "}
          <code className="rounded bg-muted px-1">CLOUDINARY_CLOUD_NAME</code>,{" "}
          <code className="rounded bg-muted px-1">CLOUDINARY_API_KEY</code>, and{" "}
          <code className="rounded bg-muted px-1">CLOUDINARY_API_SECRET</code> to{" "}
          <code className="rounded bg-muted px-1">apps/admin/.env.local</code> to enable uploads.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <CldUploadWidget
      signatureEndpoint="/api/cloudinary/sign"
      options={{
        cloudName,
        sources: ["local", "url", "camera"],
        multiple,
        folder: "ecom/products",
        maxFiles: multiple ? 12 : 1,
        clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
        maxFileSize: 10 * 1024 * 1024,
        styles: { palette: { window: "#ffffff" } },
      }}
      onSuccess={(result) => {
        const info = result?.info;
        if (info && typeof info !== "string" && "secure_url" in info && "public_id" in info) {
          onUploaded({
            url: info.secure_url as string,
            publicId: info.public_id as string,
          });
        }
      }}
    >
      {({ open }) => (
        <div className="space-y-2">
          {value ? (
            <div className="flex items-center gap-3 rounded-md border p-2">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={value.url}
                  alt="Uploaded"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                <p className="truncate">{value.publicId}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onUploaded({ url: "", publicId: "" })}
                aria-label="Remove"
              >
                <X />
              </Button>
            </div>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => open()}>
            <Upload /> {buttonLabel}
          </Button>
        </div>
      )}
    </CldUploadWidget>
  );
}
