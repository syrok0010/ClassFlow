import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { prisma } from "./prisma";
import { getUserDomainRoles } from "./auth-domain-roles";

const isAuthRateLimitDisabled = process.env.DISABLE_AUTH_RATE_LIMIT === "true";

const authOptions = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  rateLimit: {
    enabled: !isAuthRateLimitDisabled,
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      surname: {
        type: "string",
        required: false,
      },
      patronymicName: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "PENDING_INVITE",
      },
    },
  },
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...(authOptions.plugins ?? []),
    customSession(
      async ({ user, session }) => {
        const domainRoles = await getUserDomainRoles(user.id);
        return {
          user: {
            ...user,
            domainRoles,
          },
          session,
        };
      },
      authOptions,
    ),
  ],
});
