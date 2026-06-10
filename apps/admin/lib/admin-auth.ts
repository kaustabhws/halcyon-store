import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const MOCK_ADMIN_ENABLED = process.env.MOCK_ADMIN === "true";
const CLERK_CONFIGURED = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export type AdminContext = {
  adminId: string;
  email: string;
  fullName: string | null;
  permissions: Set<string>;
  isMock: boolean;
};

/**
 * Resolve the current admin. In "mock" mode (Clerk keys absent and
 * MOCK_ADMIN=true), returns a synthetic super-admin so the dashboard is
 * usable in local dev. In real mode, requires a Clerk session and an
 * Admin row keyed by clerkUserId.
 */
export async function requireAdmin(): Promise<AdminContext> {
  if (MOCK_ADMIN_ENABLED && !CLERK_CONFIGURED) {
    return getOrCreateMockAdmin();
  }

  const { userId } = await clerkAuth();
  if (!userId) throw new Error("Not authenticated");

  let admin = await prisma.admin.findUnique({
    where: { clerkUserId: userId },
    include: {
      roleAssignments: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });

  if (!admin) {
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error("Admin has no email on Clerk profile");
    admin = await prisma.admin.create({
      data: {
        clerkUserId: userId,
        email,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        status: "ACTIVE",
      },
      include: {
        roleAssignments: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });
  }

  // Every admin gets super_admin. The role/permission tables exist for the
  // future when granular roles are added, but for now any human who can sign
  // into the admin panel has full access.
  if (admin.roleAssignments.length === 0) {
    const role = await prisma.role.findUnique({ where: { name: "super_admin" } });
    if (role) {
      await prisma.roleAssignment.create({
        data: { adminId: admin.id, roleId: role.id },
      });
      // Re-read with the freshly assigned role so the permission set below
      // includes it on this very request.
      admin = await prisma.admin.findUniqueOrThrow({
        where: { id: admin.id },
        include: {
          roleAssignments: {
            include: {
              role: { include: { permissions: { include: { permission: true } } } },
            },
          },
        },
      });
    }
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const permissions = new Set<string>();
  for (const ra of admin.roleAssignments) {
    for (const rp of ra.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  return {
    adminId: admin.id,
    email: admin.email,
    fullName: [admin.firstName, admin.lastName].filter(Boolean).join(" ") || null,
    permissions,
    isMock: false,
  };
}

async function getOrCreateMockAdmin(): Promise<AdminContext> {
  const email = "admin@local";
  const admin = await prisma.admin.upsert({
    where: { clerkUserId: "mock_admin" },
    update: { lastLoginAt: new Date() },
    create: {
      clerkUserId: "mock_admin",
      email,
      firstName: "Mock",
      lastName: "Admin",
      status: "ACTIVE",
    },
  });

  // Assign super_admin role idempotently. NULL columns aren't covered by
  // Postgres unique indexes, so we can't use a compound upsert here.
  const role = await prisma.role.findUnique({ where: { name: "super_admin" } });
  if (role) {
    const existing = await prisma.roleAssignment.findFirst({
      where: { adminId: admin.id, roleId: role.id, vendorId: null },
    });
    if (!existing) {
      await prisma.roleAssignment.create({
        data: { adminId: admin.id, roleId: role.id },
      });
    }
  }

  const permissions = await prisma.permission.findMany({ select: { key: true } });
  return {
    adminId: admin.id,
    email,
    fullName: "Mock Admin",
    permissions: new Set(permissions.map((p) => p.key)),
    isMock: true,
  };
}

export function isMockAdminEnabled(): boolean {
  return MOCK_ADMIN_ENABLED && !CLERK_CONFIGURED;
}

export function isClerkConfigured(): boolean {
  return CLERK_CONFIGURED;
}

export function hasPermission(ctx: AdminContext, key: string): boolean {
  return ctx.permissions.has(key);
}

export function requirePermission(ctx: AdminContext, key: string): void {
  if (!hasPermission(ctx, key)) {
    throw new Error(`Missing permission: ${key}`);
  }
}
