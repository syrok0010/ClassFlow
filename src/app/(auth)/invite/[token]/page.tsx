import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { redirectToDefaultPathOr404 } from "@/lib/auth-redirect";
import { isPlaceholderInviteEmail } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

import { InviteForm } from "./_components/invite-form";

async function getInviteInitialValues(token: string) {
  const verification = await prisma.verification.findFirst({
    where: { value: token, expiresAt: { gt: new Date() } },
    select: {
      identifier: true,
    },
  });

  if (!verification) {
    return undefined;
  }

  const user = await prisma.user.findUnique({
    where: { id: verification.identifier },
    select: {
      status: true,
      surname: true,
      name: true,
      patronymicName: true,
      email: true,
    },
  });

  if (!user || user.status !== "PENDING_INVITE") {
    return undefined;
  }

  return {
    surname: user.surname ?? "",
    name: user.name ?? "",
    patronymicName: user.patronymicName ?? "",
    email: isPlaceholderInviteEmail(user.email) ? "" : user.email ?? "",
  };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirectToDefaultPathOr404(session.user);
  }

  const { token } = await params;
  const initialValues = await getInviteInitialValues(token);

  return <InviteForm token={token} initialValues={initialValues} />;
}
