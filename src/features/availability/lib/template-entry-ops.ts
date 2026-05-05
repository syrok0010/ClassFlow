import type {
  TeacherAvailabilityTemplateEditorInput,
} from "./schemas";
import { normalizeTemplateEntries } from "./utils";
import type { AvailabilityTemplateEntry } from "./types";

export function toTeacherAvailabilityEntryInput(
  entry: Pick<AvailabilityTemplateEntry, "dayOfWeek" | "startTime" | "endTime" | "type">,
): TeacherAvailabilityTemplateEditorInput {
  return {
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    type: entry.type,
  };
}

export function toTeacherAvailabilityEntryInputs(
  entries: Array<Pick<AvailabilityTemplateEntry, "dayOfWeek" | "startTime" | "endTime" | "type">>,
): TeacherAvailabilityTemplateEditorInput[] {
  return entries.map(toTeacherAvailabilityEntryInput);
}

export function buildEntriesAfterTemplateSave(
  entries: AvailabilityTemplateEntry[],
  nextEntry:
    | TeacherAvailabilityTemplateEditorInput
    | Omit<TeacherAvailabilityTemplateEditorInput, "type"> & {
        type: TeacherAvailabilityTemplateEditorInput["type"];
      },
  previousId?: string,
): TeacherAvailabilityTemplateEditorInput[] {
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
): TeacherAvailabilityTemplateEditorInput[] {
  return toTeacherAvailabilityEntryInputs(entries.filter((entry) => entry.id !== entryId));
}
