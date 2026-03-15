import {notFound} from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import React from "react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "ADMIN") {
    return notFound();
  }

  return <>{children}</>;
}
