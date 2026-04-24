import { FET_DAY_END_MINUTES, FET_DAY_START_MINUTES, FET_DAYS, FET_PERIOD_MINUTES } from "./env";
import type { FetActivity, FetInput, FetTimeSlot } from "./types";

const DAY_NAME_BY_NUMBER = new Map(FET_DAYS.map((day) => [day.dayOfWeek, day.name]));

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function minutesToFetHour(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function periodCount(durationInMinutes: number): number {
  return durationInMinutes / FET_PERIOD_MINUTES;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function getHours(): string[] {
  const hours: string[] = [];
  for (let minute = FET_DAY_START_MINUTES; minute < FET_DAY_END_MINUTES; minute += FET_PERIOD_MINUTES) {
    hours.push(minutesToFetHour(minute));
  }
  return hours;
}

function getActivityStartingTimesXml(activity: FetActivity): string {
  const slots = activity.fixedSlot ? [activity.fixedSlot] : activity.allowedSlots;

  return [
    "    <ConstraintActivityPreferredStartingTimes>",
    "      <Weight_Percentage>100</Weight_Percentage>",
    `      <Activity_Id>${activity.id}</Activity_Id>`,
    `      <Number_of_Preferred_Starting_Times>${slots.length}</Number_of_Preferred_Starting_Times>`,
    ...slots.flatMap((slot) => [
      "      <Preferred_Starting_Time>",
      `        <Preferred_Starting_Day>${DAY_NAME_BY_NUMBER.get(slot.dayOfWeek)}</Preferred_Starting_Day>`,
      `        <Preferred_Starting_Hour>${minutesToFetHour(slot.startTime)}</Preferred_Starting_Hour>`,
      "      </Preferred_Starting_Time>",
    ]),
    "      <Active>true</Active>",
    "      <Comments></Comments>",
    "    </ConstraintActivityPreferredStartingTimes>",
  ].join("\n");
}

function getActivityRoomXml(activity: FetActivity): string | null {
  if (activity.fixedRoomId) {
    return [
      "    <ConstraintActivityPreferredRoom>",
      "      <Weight_Percentage>100</Weight_Percentage>",
      `      <Activity_Id>${activity.id}</Activity_Id>`,
      `      <Room>${escapeXml(activity.fixedRoomId)}</Room>`,
      "      <Permanently_Locked>true</Permanently_Locked>",
      "      <Active>true</Active>",
      "      <Comments></Comments>",
      "    </ConstraintActivityPreferredRoom>",
    ].join("\n");
  }

  if (activity.roomIds.length === 0) return null;

  return [
    "    <ConstraintActivityPreferredRooms>",
    "      <Weight_Percentage>100</Weight_Percentage>",
    `      <Activity_Id>${activity.id}</Activity_Id>`,
    `      <Number_of_Preferred_Rooms>${activity.roomIds.length}</Number_of_Preferred_Rooms>`,
    ...activity.roomIds.map((roomId) => `      <Preferred_Room>${escapeXml(roomId)}</Preferred_Room>`),
    "      <Active>true</Active>",
    "      <Comments></Comments>",
    "    </ConstraintActivityPreferredRooms>",
  ].join("\n");
}

function getTeacherNotAvailableXml(input: FetInput): string[] {
  const normalizeTime = (value: number | Date) => {
    if (typeof value === "number") return value;

    return value.getHours() * 60 + value.getMinutes();
  };

  return input.teacherAvailabilities
    .filter((availability) => availability.type === "UNAVAILABLE" && availability.dayOfWeek >= 1 && availability.dayOfWeek <= 5)
    .map((availability) => {
      const slots: FetTimeSlot[] = [];
      const startMinutes = normalizeTime(availability.startTime);
      const endMinutes = normalizeTime(availability.endTime);

      for (
        let startTime = Math.max(startMinutes, FET_DAY_START_MINUTES);
        startTime < Math.min(endMinutes, FET_DAY_END_MINUTES);
        startTime += FET_PERIOD_MINUTES
      ) {
        slots.push({ dayOfWeek: availability.dayOfWeek as FetTimeSlot["dayOfWeek"], startTime });
      }

      return [
        "    <ConstraintTeacherNotAvailableTimes>",
        "      <Weight_Percentage>100</Weight_Percentage>",
        `      <Teacher>${escapeXml(availability.teacherId)}</Teacher>`,
        `      <Number_of_Not_Available_Times>${slots.length}</Number_of_Not_Available_Times>`,
        ...slots.flatMap((slot) => [
          "      <Not_Available_Time>",
          `        <Day>${DAY_NAME_BY_NUMBER.get(slot.dayOfWeek)}</Day>`,
          `        <Hour>${minutesToFetHour(slot.startTime)}</Hour>`,
          "      </Not_Available_Time>",
        ]),
        "      <Active>true</Active>",
        "      <Comments></Comments>",
        "    </ConstraintTeacherNotAvailableTimes>",
      ].join("\n");
    });
}

export function buildFetXml(input: FetInput, activities: FetActivity[]): string {
  const activeGroupIds = unique(activities.map((activity) => activity.groupId));
  const activeSubjectIds = unique(activities.map((activity) => activity.subjectId));
  const activeTeacherIds = unique(
    activities.map((activity) => activity.teacherId).filter((teacherId): teacherId is string => Boolean(teacherId)),
  );
  const activeRoomIds = unique(activities.flatMap((activity) => activity.fixedRoomId ? [activity.fixedRoomId] : activity.roomIds));
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const subjectsById = new Map(input.subjects.map((subject) => [subject.id, subject]));
  const roomsById = new Map(input.rooms.map((room) => [room.id, room]));
  const hours = getHours();

  return `<?xml version="1.0" encoding="UTF-8"?>
<fet version="6.25.0">
  <Mode>Official</Mode>
  <Institution_Name>ClassFlow</Institution_Name>
  <Comments></Comments>
  <Days_List>
    <Number_of_Days>${FET_DAYS.length}</Number_of_Days>
${FET_DAYS.map((day) => `    <Day><Name>${day.name}</Name></Day>`).join("\n")}
  </Days_List>
  <Hours_List>
    <Number_of_Hours>${hours.length}</Number_of_Hours>
${hours.map((hour) => `    <Hour><Name>${hour}</Name></Hour>`).join("\n")}
  </Hours_List>
  <Subjects_List>
${activeSubjectIds.map((subjectId) => `    <Subject><Name>${escapeXml(subjectId)}</Name><Comments>${escapeXml(subjectsById.get(subjectId)?.name ?? subjectId)}</Comments></Subject>`).join("\n")}
  </Subjects_List>
  <Teachers_List>
${activeTeacherIds.map((teacherId) => `    <Teacher><Name>${escapeXml(teacherId)}</Name><Target_Number_of_Hours>0</Target_Number_of_Hours><Qualified_Subjects></Qualified_Subjects><Comments></Comments></Teacher>`).join("\n")}
  </Teachers_List>
  <Students_List>
${activeGroupIds.map((groupId) => `    <Year><Name>${escapeXml(groupId)}</Name><Number_of_Students>0</Number_of_Students><Comments>${escapeXml(groupsById.get(groupId)?.name ?? groupId)}</Comments></Year>`).join("\n")}
  </Students_List>
  <Activities_List>
${activities.map((activity) => `    <Activity>
      <Teacher>${activity.teacherId ? escapeXml(activity.teacherId) : ""}</Teacher>
      <Subject>${escapeXml(activity.subjectId)}</Subject>
      <Students>${escapeXml(activity.groupId)}</Students>
      <Duration>${periodCount(activity.durationInMinutes)}</Duration>
      <Total_Duration>${periodCount(activity.durationInMinutes)}</Total_Duration>
      <Id>${activity.id}</Id>
      <Activity_Group_Id>0</Activity_Group_Id>
      <Active>true</Active>
      <Comments>${activity.source}</Comments>
    </Activity>`).join("\n")}
  </Activities_List>
  <Buildings_List></Buildings_List>
  <Rooms_List>
${activeRoomIds.map((roomId) => `    <Room><Name>${escapeXml(roomId)}</Name><Building></Building><Capacity>0</Capacity><Virtual>false</Virtual><Comments>${escapeXml(roomsById.get(roomId)?.name ?? roomId)}</Comments></Room>`).join("\n")}
  </Rooms_List>
  <Time_Constraints_List>
    <ConstraintBasicCompulsoryTime>
      <Weight_Percentage>100</Weight_Percentage>
      <Active>true</Active>
      <Comments></Comments>
    </ConstraintBasicCompulsoryTime>
${activities.map(getActivityStartingTimesXml).join("\n")}
${getTeacherNotAvailableXml(input).join("\n")}
  </Time_Constraints_List>
  <Space_Constraints_List>
    <ConstraintBasicCompulsorySpace>
      <Weight_Percentage>100</Weight_Percentage>
      <Active>true</Active>
      <Comments></Comments>
    </ConstraintBasicCompulsorySpace>
${activities.map(getActivityRoomXml).filter((xml): xml is string => Boolean(xml)).join("\n")}
  </Space_Constraints_List>
</fet>
`;
}
