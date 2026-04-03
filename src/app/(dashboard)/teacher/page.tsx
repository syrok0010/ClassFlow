import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export default async function TeacherHomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.domainRoles?.includes("teacher")) {
    notFound();
  }

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Кабинет преподавателя</h1>
      <p className="text-muted-foreground">
        Выберите нужный раздел в левом меню. Нереализованные экраны пока будут открываться как
        `404`.
      </p>
    </div>
  );
}
