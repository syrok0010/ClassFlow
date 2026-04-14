import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

import { Sidebar } from "./Sidebar";
import { SidebarMainContent } from "./SidebarMainContent";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar user={session.user} />
      <SidebarMainContent>{children}</SidebarMainContent>
    </div>
  );
}
