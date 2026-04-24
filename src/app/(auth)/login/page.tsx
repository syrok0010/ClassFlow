import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { redirectToDefaultPathOr404 } from "@/lib/auth-redirect";

import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirectToDefaultPathOr404(session.user);
  }

  return <LoginForm />;
}
