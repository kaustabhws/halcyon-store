import { v2 as cloudinary } from "cloudinary";

const CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME ??
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
  "";
const API_KEY =
  process.env.CLOUDINARY_API_KEY ??
  process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ??
  "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "";

const CLOUDINARY_CONFIGURED = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  return CLOUDINARY_CONFIGURED;
}

export function cloudinaryCloudName(): string | null {
  return CLOUD_NAME || null;
}

export function cloudinaryApiKey(): string | null {
  return API_KEY || null;
}

/** Client-safe Cloudinary config for the ImageUploader component. */
export function cloudinaryClientConfig(): {
  cloudName: string | null;
  apiKey: string | null;
  configured: boolean;
} {
  return {
    cloudName: CLOUD_NAME || null,
    apiKey: API_KEY || null,
    configured: CLOUDINARY_CONFIGURED,
  };
}

/**
 * Generate a signature for the Cloudinary upload widget. The widget calls
 * our /api/cloudinary/sign endpoint and signs `paramsToSign` with the
 * private API secret, then uploads directly to Cloudinary using the
 * signature.
 */
export function signUploadParams(paramsToSign: Record<string, unknown>): string {
  if (!CLOUDINARY_CONFIGURED) {
    throw new Error("Cloudinary is not configured");
  }
  return cloudinary.utils.api_sign_request(
    paramsToSign as Record<string, string>,
    API_SECRET,
  );
}

export { cloudinary };
