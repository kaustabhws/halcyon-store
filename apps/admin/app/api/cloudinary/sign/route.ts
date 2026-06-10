import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import {
  isCloudinaryConfigured,
  signUploadParams,
} from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const SignBody = z.object({
  paramsToSign: z.record(z.string(), z.unknown()),
});

/**
 * Cloudinary signed-upload endpoint. The browser asks us to sign the
 * upload params; we sign them with the private API secret. The browser
 * then uploads directly to Cloudinary (we never proxy the bytes).
 */
export async function POST(req: Request) {
  await requireAdmin();

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary not configured. Add CLOUDINARY_* env vars." },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SignBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "paramsToSign required", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const signature = signUploadParams(parsed.data.paramsToSign);
  return NextResponse.json({ signature });
}
