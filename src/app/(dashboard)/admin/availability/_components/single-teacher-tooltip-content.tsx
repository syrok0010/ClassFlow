import {
  AVAILABILITY_TYPE_LABELS,
  type TeacherMinuteState,
} from "@/features/availability/lib/utils";

type SingleTeacherTooltipContentProps = {
  dayLabel: string;
  dateLabel: string;
  minuteLabel: string;
  state: TeacherMinuteState;
};

export function SingleTeacherTooltipContent({
  dayLabel,
  dateLabel,
  minuteLabel,
  state,
}: SingleTeacherTooltipContentProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-foreground">
        {dayLabel}, {dateLabel} {minuteLabel}
      </p>
      <div className="flex flex-col gap-1 text-muted-foreground">
        <p>
          {state.availability
            ? `${AVAILABILITY_TYPE_LABELS[state.availability]} ${state.isOverride ? "(Исключение)" : ""}`
            : "Шаблон не задан"}
        </p>
      </div>
    </div>
  );
}
