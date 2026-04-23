import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import type { AvailabilityTeacher } from "../_lib/types";
import { getWeekRangeLabel } from "../_lib/utils";
import { getTeacherStatusBadges } from "./availability-view-helpers";

type TeacherSelectorPanelProps = {
  teachers: AvailabilityTeacher[];
  allTeachersCount: number;
  selectedTeacherIds: string[];
  weekStart: Date;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onTeacherToggle: (teacherId: string) => void;
  onClearSelection: () => void;
};

export function TeacherSelectorPanel({
  teachers,
  allTeachersCount,
  selectedTeacherIds,
  weekStart,
  searchQuery,
  onSearchQueryChange,
  onTeacherToggle,
  onClearSelection,
}: TeacherSelectorPanelProps) {
  return (
    <Card className="w-full shrink-0 md:sticky md:top-4 md:w-90 md:max-h-[calc(100dvh-2rem)] md:self-start">
      <CardHeader className="border-b">
        <CardTitle>Преподаватели</CardTitle>
        <CardDescription>
          Поиск, мультивыбор и контроль качества данных по неделе {getWeekRangeLabel(weekStart)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Поиск по ФИО или e-mail"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground h-7">
            <span>
              Выбрано {selectedTeacherIds.length} из {allTeachersCount}
            </span>
            {selectedTeacherIds.length > 0 ? (
              <Button variant="outline" size="sm" onClick={onClearSelection}>
                <X data-icon="inline-start" />
                Сбросить
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {teachers.length === 0 ? (
            <Empty className="min-h-80">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>Ничего не найдено</EmptyTitle>
                <EmptyDescription>
                  Измените текст поиска.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            teachers.map((teacher) => {
              const isSelected = selectedTeacherIds.includes(teacher.teacherId);

              return (
                <div
                  key={teacher.teacherId}
                  role="button"
                  tabIndex={0}
                  onClick={() => onTeacherToggle(teacher.teacherId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onTeacherToggle(teacher.teacherId);
                    }
                  }}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{teacher.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {teacher.email ?? "email не указан"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {getTeacherStatusBadges(teacher, weekStart).map((badge, index) => (
                          <span key={`${teacher.teacherId}-${index}`}>{badge}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
