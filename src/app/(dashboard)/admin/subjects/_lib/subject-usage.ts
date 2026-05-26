import type { SubjectUsage } from "./types";

export function hasSubjectDependencies(usage: SubjectUsage): boolean {
  return (
    usage.roomsCount > 0 ||
    usage.requirementsCount > 0 ||
    usage.teachersCount > 0 ||
    usage.scheduleTemplatesCount > 0 ||
    usage.scheduleEntriesCount > 0
  );
}
