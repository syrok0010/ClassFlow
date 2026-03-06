import { Sidebar } from "./Sidebar";
import { SidebarMainContent } from "./SidebarMainContent";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar />
      <SidebarMainContent>{children}</SidebarMainContent>
    </div>
  );
}
