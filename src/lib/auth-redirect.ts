import { notFound, redirect } from "next/navigation";

import { getDefaultPath, type SessionAccessUser } from "./auth-access";

export function redirectToDefaultPathOr404(user: SessionAccessUser): never {
  const targetPath = getDefaultPath(user);

  if (!targetPath) {
    notFound();
  }

  redirect(targetPath);
}
