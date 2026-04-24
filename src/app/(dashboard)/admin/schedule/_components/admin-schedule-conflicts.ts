import type { AdminScheduleEvent } from "../_lib/admin-schedule-types";

export type ConflictSeverity = "hard" | "warning";

export type EventConflict = {
  severity: ConflictSeverity;
  fields: Array<"time" | "subject" | "group" | "room" | "teacher">;
  message: string;
};

export function detectAdminScheduleConflicts(events: AdminScheduleEvent[]) {
  const byEvent = new Map<string, EventConflict[]>();

  const add = (eventId: string, conflict: EventConflict) => {
    const next = byEvent.get(eventId) ?? [];
    next.push(conflict);
    byEvent.set(eventId, next);
  };

  for (let i = 0; i < events.length; i += 1) {
    for (let j = i + 1; j < events.length; j += 1) {
      const left = events[i];
      const right = events[j];

      if (left.dayOfWeek !== right.dayOfWeek) {
        continue;
      }

      const overlaps = left.startMinutes < right.endMinutes && right.startMinutes < left.endMinutes;
      if (!overlaps) {
        continue;
      }

      if (left.classId === right.classId && left.groupId === right.groupId) {
        const conflict: EventConflict = {
          severity: "hard",
          fields: ["time", "group"],
          message: "Группа назначена на два занятия одновременно",
        };
        add(left.id, conflict);
        add(right.id, conflict);
      }

      if (left.roomId && right.roomId && left.roomId === right.roomId) {
        const conflict: EventConflict = {
          severity: "hard",
          fields: ["time", "room"],
          message: "Кабинет занят в то же время",
        };
        add(left.id, conflict);
        add(right.id, conflict);
      }

      if (left.teacherId && right.teacherId && left.teacherId === right.teacherId) {
        const conflict: EventConflict = {
          severity: "hard",
          fields: ["time", "teacher"],
          message: "Учитель назначен в одно и то же время",
        };
        add(left.id, conflict);
        add(right.id, conflict);
      }
    }
  }

  const preferredByGroupSubject = new Map<string, string>();
  for (const event of events) {
    if (!event.teacherId) {
      continue;
    }
    const key = `${event.groupId}:${event.subjectId}`;
    if (!preferredByGroupSubject.has(key)) {
      preferredByGroupSubject.set(key, event.teacherId);
      continue;
    }
    const preferred = preferredByGroupSubject.get(key);
    if (preferred && preferred !== event.teacherId) {
      add(event.id, {
        severity: "warning",
        fields: ["subject", "teacher"],
        message: "Для этой группы предмет обычно ведет другой учитель",
      });
    }
  }

  return byEvent;
}
