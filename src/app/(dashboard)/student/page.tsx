import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export default async function StudentHomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.domainRoles?.includes("student")) {
    notFound();
  }

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Кабинет ученика</h1>
      <p className="text-muted-foreground">
        Здесь будет стартовая страница ученического портала. Нереализованные разделы остаются
        недоступными и открываются как `404`.
      </p>
    </div>
  );
}
