import Link from "next/link";
import { headers } from "next/headers";
import { FileQuestion, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";

export default async function NotFound() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const homeURL = session?.user?.role === "ADMIN" ? "/admin" : "/";
  const homeLabel = session?.user?.role === "ADMIN" ? "В панель управления" : "На главную";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center font-sans">
      <div className="relative mb-8">
        <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl opacity-50" />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <FileQuestion className="h-16 w-16 text-primary animate-pulse" />
        </div>
      </div>

      <h1 className="mb-2 text-6xl font-black tracking-tighter text-slate-900">404</h1>
      <h2 className="mb-4 text-2xl font-bold text-slate-800">Страница не найдена</h2>

      <p className="mb-8 max-w-md text-slate-600 leading-relaxed">
        Похоже, этой страницы не существует или у вас недостаточно прав для её просмотра.
        Проверьте правильность адреса или воспользуйтесь навигацией ниже.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <BackButton />
        <Link href={homeURL}>
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 px-6">
            <Home className="h-4 w-4" />
            {homeLabel}
          </Button>
        </Link>
      </div>

      <div className="mt-12 text-sm text-slate-400">
        ClassFlow &copy; {new Date().getFullYear()} — Умное расписание
      </div>
    </div>
  );
}
