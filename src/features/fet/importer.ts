import { FET_DAYS } from "./env";
import { minutesToFetHour } from "./fet-xml";
import type { FetActivity, FetDayOfWeek, FetImportedActivity, FetTemplateRow } from "./types";

const DAY_BY_NAME = new Map(FET_DAYS.map((day) => [day.name, day.dayOfWeek]));

function decodeXml(value: string): string {
  return value
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function getTagValue(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`));
  return match ? decodeXml(match[1].trim()) : null;
}

function parseHour(hour: string): number {
  const [hours, minutes] = hour.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`FET вернул некорректное время "${hour}"`);
  }

  return hours * 60 + minutes;
}

export function importFetActivitiesXml(xml: string): FetImportedActivity[] {
  const matches = xml.matchAll(/<Activity>([\s\S]*?)<\/Activity>/g);
  const activities: FetImportedActivity[] = [];

  for (const match of matches) {
    const activityXml = match[1];
    const idValue = getTagValue(activityXml, "Id") ?? getTagValue(activityXml, "Activity_Id");
    const dayValue = getTagValue(activityXml, "Day");
    const hourValue = getTagValue(activityXml, "Hour");

    if (!idValue || !dayValue || !hourValue) continue;

    const dayOfWeek = DAY_BY_NAME.get(dayValue);
    if (!dayOfWeek) {
      throw new Error(`FET вернул неизвестный день "${dayValue}"`);
    }

    const roomId = getTagValue(activityXml, "Room");

    activities.push({
      activityId: Number(idValue),
      dayOfWeek,
      startTime: parseHour(hourValue),
      roomId: roomId || null,
    });
  }

  return activities;
}

export function mapImportedActivitiesToTemplateRows(
  activities: FetActivity[],
  importedActivities: FetImportedActivity[],
): FetTemplateRow[] {
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const rows: FetTemplateRow[] = [];

  for (const importedActivity of importedActivities) {
    const activity = activityById.get(importedActivity.activityId);
    if (!activity) continue;

    rows.push({
      dayOfWeek: importedActivity.dayOfWeek,
      startTime: importedActivity.startTime,
      endTime: importedActivity.startTime + activity.durationInMinutes,
      groupId: activity.groupId,
      roomId: importedActivity.roomId,
      teacherId: activity.teacherId,
      subjectId: activity.subjectId,
    });
  }

  const missingActivities = activities.filter((activity) => !rows.some((row) => {
    const imported = importedActivities.find((item) => item.activityId === activity.id);
    return imported && row.startTime === imported.startTime && row.dayOfWeek === imported.dayOfWeek;
  }));

  if (missingActivities.length > 0) {
    throw new Error(`FET не вернул activities: ${missingActivities.map((activity) => activity.id).join(", ")}`);
  }

  return rows.sort((left, right) =>
    left.dayOfWeek - right.dayOfWeek ||
    left.startTime - right.startTime ||
    left.groupId.localeCompare(right.groupId) ||
    left.subjectId.localeCompare(right.subjectId),
  );
}

export function assertActivityInsideSlots(activity: FetActivity, imported: FetImportedActivity): void {
  const allowed = activity.allowedSlots.some(
    (slot) => slot.dayOfWeek === imported.dayOfWeek && minutesToFetHour(slot.startTime) === minutesToFetHour(imported.startTime),
  );

  if (!allowed) {
    throw new Error(`FET вернул activity ${activity.id} вне разрешенного окна`);
  }
}

export function isFetDayOfWeek(value: number): value is FetDayOfWeek {
  return value >= 1 && value <= 5;
}
