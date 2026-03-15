import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
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
});
