import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const REDIRECT_ROUTES: Record<string, string> = {
    ADMIN: "/admin",
    TEACHER: "/teacher",
    STUDENT: "/student",
    PARENT: "/parent",
  };

  const targetPath = REDIRECT_ROUTES[session.user.role as keyof typeof REDIRECT_ROUTES];
  redirect(targetPath ? targetPath : "/login");
}
