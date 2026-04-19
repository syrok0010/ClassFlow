import { ScheduleDemo } from "@/features/schedule/components/schedule-demo";
import {
  createFallbackScheduleEntries,
  scheduleEntryDemoArgs,
} from "@/features/schedule/lib/schedule-entry-demo-data";
import { prisma } from "@/lib/prisma";

export default async function SchedulePage() {
  const scheduleEntries = await prisma.scheduleEntry.findMany({
    ...scheduleEntryDemoArgs,
    orderBy: [
      { startTime: "asc" },
      { endTime: "asc" },
    ],
  });

  const demoEntries =
    scheduleEntries.length > 0 ? scheduleEntries : createFallbackScheduleEntries();
  const source = scheduleEntries.length > 0 ? "database" : "fixtures";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Демо расписания</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Тестовая страница для визуальной проверки общего read-only schedule-компонента на базе
          доменных записей `ScheduleEntry`. Если в локальной БД еще нет расписания, страница
          использует fallback fixtures, совпадающие по форме с Prisma-моделью и ее связями.
        </p>
      </div>

      <ScheduleDemo entries={demoEntries} source={source} />
    </div>
  );
}
