import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export default async function ParentHomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.domainRoles?.includes("parent")) {
    notFound();
  }

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Кабинет родителя</h1>
      <p className="text-muted-foreground">
        Здесь будет стартовая страница родительского портала. Остальные planned-маршруты пока могут
        вести в `404`.
      </p>
    </div>
  );
}
