import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { redirectToDefaultPathOr404 } from "@/lib/auth-redirect";

import { InviteForm } from "./_components/invite-form";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirectToDefaultPathOr404(session.user);
  }

  const { token } = await params;

  return <InviteForm token={token} />;
}
