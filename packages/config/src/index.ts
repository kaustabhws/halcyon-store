export type AppEnv = "development" | "staging" | "production";

export interface SharedEnv {
  NODE_ENV: AppEnv;
  DATABASE_URL: string;
  REDIS_URL?: string;
  MEILISEARCH_HOST?: string;
  MEILISEARCH_API_KEY?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
}

const REQUIRED: (keyof SharedEnv)[] = ["NODE_ENV", "DATABASE_URL"];

export function loadSharedEnv(source: NodeJS.ProcessEnv = process.env): SharedEnv {
  const missing = REQUIRED.filter((k) => !source[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  const env = source.NODE_ENV;
  if (env !== "development" && env !== "staging" && env !== "production") {
    throw new Error(`Invalid NODE_ENV: ${env}`);
  }
  return {
    NODE_ENV: env,
    DATABASE_URL: source.DATABASE_URL as string,
    REDIS_URL: source.REDIS_URL,
    MEILISEARCH_HOST: source.MEILISEARCH_HOST,
    MEILISEARCH_API_KEY: source.MEILISEARCH_API_KEY,
    CLOUDINARY_CLOUD_NAME: source.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: source.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: source.CLOUDINARY_API_SECRET,
    RAZORPAY_KEY_ID: source.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: source.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: source.RAZORPAY_WEBHOOK_SECRET,
  };
}
