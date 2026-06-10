import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const customer = await prisma.customer.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!customer || !customer.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, customer.passwordHash);
        if (!ok) return null;

        await prisma.customer.update({
          where: { id: customer.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: customer.id,
          email: customer.email,
          name: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Credentials authorize() already returns a fully-resolved user.
      if (account?.provider === "credentials") return true;

      // OAuth: create-or-link the Customer row keyed by email.
      const email = (user.email ?? profile?.email)?.toLowerCase();
      if (!email) return false;

      const name = user.name ?? (profile?.name as string | undefined) ?? null;
      const [firstName, ...rest] = name?.split(" ") ?? [];

      const existing = await prisma.customer.findUnique({ where: { email } });
      const customer = existing
        ? await prisma.customer.update({
            where: { id: existing.id },
            data: { lastLoginAt: new Date(), emailVerified: existing.emailVerified ?? new Date() },
          })
        : await prisma.customer.create({
            data: {
              email,
              firstName: firstName ?? null,
              lastName: rest.length > 0 ? rest.join(" ") : null,
              emailVerified: new Date(),
              lastLoginAt: new Date(),
            },
          });

      if (account) {
        await prisma.oAuthAccount.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope ?? null,
            tokenType: account.token_type ?? null,
            idToken: account.id_token ?? null,
          },
          create: {
            customerId: customer.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope ?? null,
            tokenType: account.token_type ?? null,
            idToken: account.id_token ?? null,
          },
        });
      }

      // Stash customerId on the user so the jwt callback can lift it.
      user.id = customer.id;
      return true;
    },

    async jwt({ token, user }) {
      // First sign-in: copy from the User into the JWT.
      if (user?.id) {
        token.customerId = user.id;
        if (user.email) token.email = user.email;
      }
      // Subsequent calls: token already has customerId; verify the customer
      // still exists (handles soft-delete / suspension between requests).
      if (!token.customerId && token.email) {
        const c = await prisma.customer.findUnique({
          where: { email: token.email },
          select: { id: true, status: true },
        });
        if (c && c.status === "ACTIVE") token.customerId = c.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.customerId) session.user.id = token.customerId;
      if (token.email) session.user.email = token.email;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
