import type {
  TeacherAvailabilityEntryInput,
  TeacherAvailabilityTemplateEditorInput,
} from "./schemas";
import { normalizeTemplateEntries } from "./utils";
import type { AvailabilityTemplateEntry } from "./types";

export function toTeacherAvailabilityEntryInput(
  entry: Pick<AvailabilityTemplateEntry, "dayOfWeek" | "startTime" | "endTime" | "type">,
): TeacherAvailabilityEntryInput {
  return {
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    type: entry.type,
  };
}

export function toTeacherAvailabilityEntryInputs(
  entries: Array<Pick<AvailabilityTemplateEntry, "dayOfWeek" | "startTime" | "endTime" | "type">>,
): TeacherAvailabilityEntryInput[] {
  return entries.map(toTeacherAvailabilityEntryInput);
}

export function buildEntriesAfterTemplateSave(
  entries: AvailabilityTemplateEntry[],
  nextEntry:
    | TeacherAvailabilityEntryInput
    | Omit<TeacherAvailabilityTemplateEditorInput, "type"> & {
        type: TeacherAvailabilityEntryInput["type"];
      },
  previousId?: string,
): TeacherAvailabilityEntryInput[] {
  return normalizeTemplateEntries(
    [
      ...entries
        .filter((entry) => entry.id !== previousId)
        .map(toTeacherAvailabilityEntryInput),
      toTeacherAvailabilityEntryInput(nextEntry),
    ].sort((left, right) =>
      left.dayOfWeek !== right.dayOfWeek
        ? left.dayOfWeek - right.dayOfWeek
        : left.startTime - right.startTime,
    ),
  );
}

export function buildEntriesAfterTemplateDelete(
  entries: AvailabilityTemplateEntry[],
  entryId: string,
): TeacherAvailabilityEntryInput[] {
  return toTeacherAvailabilityEntryInputs(entries.filter((entry) => entry.id !== entryId));
}
