"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Database, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { cn } from "@/lib/utils"

import { ReadonlySchedule } from "./readonly-schedule"
import type { BaseScheduleEvent, ScheduleViewMode } from "../lib/types"
import type { ScheduleEntryDemoRecord } from "../lib/schedule-entry-demo-data"

type DemoStepOption = "15" | "30" | "45" | "60"

type DemoDataSource = "database" | "fixtures"

interface ScheduleDemoProps {
  entries: readonly ScheduleEntryDemoRecord[]
  source: DemoDataSource
}

interface ScheduleEntryEvent extends BaseScheduleEvent {
  scheduleEntry: ScheduleEntryDemoRecord
}

const VIEW_MODE_OPTIONS = [
  { label: "День", value: "day" },
  { label: "Неделя", value: "week" },
] as const

const STEP_OPTIONS = [
  { label: "15 мин", value: "15" },
  { label: "30 мин", value: "30" },
  { label: "45 мин", value: "45" },
  { label: "60 мин", value: "60" },
] as const

export function ScheduleDemo({ entries, source }: ScheduleDemoProps) {
  const events = React.useMemo(() => toScheduleEntryEvents(entries), [entries])
  const initialAnchorDate = React.useMemo(
    () => events[0]?.start ?? new Date(2026, 3, 22, 0, 0, 0, 0),
    [events]
  )

  const [viewMode, setViewMode] = React.useState<ScheduleViewMode>("week")
  const [anchorDate, setAnchorDate] = React.useState(initialAnchorDate)
  const [stepMinutes, setStepMinutes] = React.useState<DemoStepOption>("30")

  React.useEffect(() => {
    setAnchorDate(initialAnchorDate)
  }, [initialAnchorDate])

  const rangeLabel = React.useMemo(
    () => formatRangeLabel(anchorDate, viewMode),
    [anchorDate, viewMode]
  )

  const selectedDayLabel = React.useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(anchorDate),
    [anchorDate]
  )

  const handleShift = (direction: "prev" | "next") => {
    const delta = direction === "prev" ? -1 : 1
    const amount = viewMode === "week" ? 7 : 1
    setAnchorDate((current) => addDays(current, delta * amount))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">Демо ScheduleEntry</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  source === "database"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                <Database className="size-3" />
                {source === "database" ? "Источник: реальная БД" : "Источник: DB-shaped fixtures"}
              </span>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Этот preview использует доменные записи `ScheduleEntry` со связями `group`, `room`,
              `teacher.user` и `subject`. Generic schedule-компонент по-прежнему получает только
              адаптированный `id/start/end`, а преобразование выполняется снаружи.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => handleShift("prev")}>
              <ChevronLeft />
            </Button>
            <div className="min-w-52 rounded-lg border bg-muted/40 px-3 py-2 text-center">
              <div className="text-sm font-medium capitalize">{rangeLabel}</div>
              <div className="text-xs text-muted-foreground capitalize">{selectedDayLabel}</div>
            </div>
            <Button variant="outline" size="icon-sm" onClick={() => handleShift("next")}>
              <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnchorDate(initialAnchorDate)
                setViewMode("week")
                setStepMinutes("30")
              }}
            >
              <RotateCcw />
              Сбросить demo
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Режим
            </span>
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={VIEW_MODE_OPTIONS}
              size="sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Шаг сетки
            </span>
            <SegmentedControl
              value={stepMinutes}
              onChange={setStepMinutes}
              options={STEP_OPTIONS}
              size="sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <LegendChip label="Учебный предмет" type="ACADEMIC" />
        <LegendChip label="Режимный блок" type="REGIME" />
      </div>

      <ReadonlySchedule
        events={events}
        anchorDate={anchorDate}
        viewMode={viewMode}
        timeRange={{
          start: "08:00",
          end: "18:00",
          stepMinutes: Number(stepMinutes),
        }}
        emptyState={{
          title: "На выбранный период событий нет",
          description: "Переключите режим или перелистните demo-неделю, чтобы увидеть заполненную сетку.",
        }}
        renderEvent={(event) => <ScheduleEntryCard event={event.scheduleEntry} />}
      />

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Пустое состояние</h2>
          <p className="text-sm text-muted-foreground">
            Ниже отдельный preview того, как выглядит общий компонент без событий.
          </p>
        </div>

        <div className="mt-4">
          <ReadonlySchedule
            events={[]}
            anchorDate={anchorDate}
            viewMode="week"
            emptyState={{
              title: "Расписание пока пустое",
              description: "Этот блок показывает базовый empty state, который увидят будущие consumer-страницы.",
            }}
            renderEvent={() => null}
          />
        </div>
      </div>
    </div>
  )
}

function ScheduleEntryCard({ event }: { event: ScheduleEntryDemoRecord }) {
  const subjectType = event.subject.type
  const toneClasses = subjectToneClasses[subjectType]
  const teacherName = formatTeacherName(event)
  const roomLabel = event.room?.building
    ? `${event.room.name} · ${event.room.building.name}`
    : event.room?.name ?? "Без кабинета"
  const tooltipText = getEventTooltip(event, roomLabel, teacherName)

  return (
    <div
      title={tooltipText}
      tabIndex={0}
      className={cn(
        "flex h-full flex-col justify-start gap-1 overflow-hidden rounded-[calc(var(--radius-lg)-2px)] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        toneClasses
      )}
    >
      <p className="min-w-0 overflow-hidden text-sm font-semibold leading-tight break-words">
        {event.subject.name}
      </p>
      <p className="min-w-0 truncate text-xs font-medium text-current/85">
        {event.group.name}
      </p>
      <p className="min-w-0 truncate text-[11px] text-current/75">
        {roomLabel}
      </p>
    </div>
  )
}

function LegendChip({
  label,
  type,
}: {
  label: string
  type: ScheduleEntryDemoRecord["subject"]["type"]
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        legendToneClasses[type]
      )}
    >
      {label}
    </span>
  )
}

function toScheduleEntryEvents(entries: readonly ScheduleEntryDemoRecord[]): ScheduleEntryEvent[] {
  return entries.map((entry) => ({
    id: entry.id,
    start: entry.startTime,
    end: entry.endTime,
    scheduleEntry: entry,
  }))
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function formatRangeLabel(anchorDate: Date, viewMode: ScheduleViewMode) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  })

  if (viewMode === "day") {
    return formatter.format(anchorDate)
  }

  const start = getStartOfWeekMonday(anchorDate)
  const end = addDays(start, 6)

  return `${formatter.format(start)} — ${formatter.format(end)}`
}

function getStartOfWeekMonday(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = start.getDay()
  const daysFromMonday = (day + 6) % 7

  start.setDate(start.getDate() - daysFromMonday)

  return start
}

function formatTimeRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return `${formatter.format(start)} – ${formatter.format(end)}`
}

function formatTeacherName(event: ScheduleEntryDemoRecord) {
  if (!event.teacher?.user) {
    return "Без преподавателя"
  }

  return [
    event.teacher.user.surname,
    event.teacher.user.name,
    event.teacher.user.patronymicName,
  ]
    .filter(Boolean)
    .join(" ")
}

function getEventTooltip(
  event: ScheduleEntryDemoRecord,
  roomLabel: string,
  teacherName: string
) {
  return [
    event.subject.name,
    `Группа: ${event.group.name}`,
    `Время: ${formatTimeRange(event.startTime, event.endTime)}`,
    `Кабинет: ${roomLabel}`,
    `Преподаватель: ${teacherName}`,
    `Тип: ${subjectTypeLabels[event.subject.type]}`,
  ].join("\n")
}

const subjectToneClasses: Record<ScheduleEntryDemoRecord["subject"]["type"], string> = {
  ACADEMIC: "bg-sky-50 text-sky-950 shadow-[inset_0_0_0_1px_rgb(186_230_253)]",
  ELECTIVE_REQUIRED: "bg-violet-50 text-violet-950 shadow-[inset_0_0_0_1px_rgb(221_214_254)]",
  ELECTIVE_OPTIONAL: "bg-amber-50 text-amber-950 shadow-[inset_0_0_0_1px_rgb(253_230_138)]",
  REGIME: "bg-rose-50 text-rose-950 shadow-[inset_0_0_0_1px_rgb(254_205_211)]",
}

const legendToneClasses: Record<ScheduleEntryDemoRecord["subject"]["type"], string> = {
  ACADEMIC: "border-sky-200 bg-sky-50 text-sky-700",
  ELECTIVE_REQUIRED: "border-violet-200 bg-violet-50 text-violet-700",
  ELECTIVE_OPTIONAL: "border-amber-200 bg-amber-50 text-amber-700",
  REGIME: "border-rose-200 bg-rose-50 text-rose-700",
}

const subjectTypeLabels: Record<ScheduleEntryDemoRecord["subject"]["type"], string> = {
  ACADEMIC: "Учебный предмет",
  ELECTIVE_REQUIRED: "Обязательный электив",
  ELECTIVE_OPTIONAL: "Электив по выбору",
  REGIME: "Режимный блок",
}
