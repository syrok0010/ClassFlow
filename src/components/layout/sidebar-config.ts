import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  BookOpen,
  Building2,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Users,
  UserSquare2,
} from "lucide-react";

import type { AccessContext } from "@/lib/auth-access";

export type SidebarItemConfig = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export type SidebarSectionConfig = {
  id: AccessContext;
  label: string;
  items: SidebarItemConfig[];
};

export const SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    id: "admin",
    label: "Администрирование",
    items: [
      { name: "Дашборд", href: "/admin", icon: LayoutDashboard },
      { name: "Расписание", href: "/admin/schedule", icon: CalendarDays },
      { name: "Помещения", href: "/admin/rooms", icon: Building2 },
      { name: "Предметы", href: "/admin/subjects", icon: BarChart },
      { name: "Группы", href: "/admin/groups", icon: Users },
      { name: "Пользователи", href: "/admin/users", icon: UserSquare2 },
      { name: "Учебный план", href: "/admin/requirements", icon: BookOpen },
    ],
  },
  {
    id: "teacher",
    label: "Мое преподавание",
    items: [
      { name: "Мои предметы", href: "/teacher/subjects", icon: BookOpen },
      { name: "Мое расписание", href: "/teacher/schedule", icon: CalendarDays },
      { name: "Моя доступность", href: "/teacher/availability", icon: UserSquare2 },
    ],
  },
  {
    id: "parent",
    label: "Мои дети",
    items: [{ name: "Дневники детей", href: "/parent/children", icon: Users }],
  },
  {
    id: "student",
    label: "Моя учеба",
    items: [{ name: "Расписание уроков", href: "/student/schedule", icon: GraduationCap }],
  },
];
