import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDefaultPath } from "@/lib/auth-access";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const targetPath = getDefaultPath(session.user);

  if (!targetPath) {
    notFound();
  }

  redirect(targetPath);
}
