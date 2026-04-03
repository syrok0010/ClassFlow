import { createAuthClient } from "better-auth/react";
import { customSessionClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    customSessionClient<typeof auth>(),
  ],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
