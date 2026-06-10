import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const MOCK_ADMIN_ENABLED = process.env.MOCK_ADMIN === "true";
const CLERK_CONFIGURED = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
]);

const realProxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

function mockProxy(_req: NextRequest) {
  return NextResponse.next();
}

/**
 * Next 16 renamed `middleware` → `proxy`. Same semantics: runs before any
 * route resolves. We swap between Clerk and a no-op based on env so dev
 * boots without Clerk keys.
 */
export default MOCK_ADMIN_ENABLED && !CLERK_CONFIGURED ? mockProxy : realProxy;

export const config = {
  matcher: [
    // Skip Next internals and static files; always run for API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
