import XMLBuilder from "fast-xml-builder";
import {
  FET_DAY_END_MINUTES,
  FET_DAY_START_MINUTES,
  FET_DAYS,
  FET_PERIOD_MINUTES,
  FET_STUDENTS_MAX_GAPS_PER_WEEK,
  FET_STUDENTS_MAX_GAPS_WEIGHT,
} from "./env";
import type { FetActivity, FetInput, FetTimeSlot } from "./types";

const DAY_NAME_BY_NUMBER = new Map(FET_DAYS.map((day) => [day.dayOfWeek, day.name]));

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

function getActivityStartingTimes(activity: FetActivity) {
  const slots = activity.fixedSlot ? [activity.fixedSlot] : activity.allowedSlots;

  return {
    Weight_Percentage: activity.timeConstraintWeight ?? 100,
    Activity_Id: activity.id,
    Number_of_Preferred_Starting_Times: slots.length,
    Preferred_Starting_Time: slots.map((slot) => ({
      Preferred_Starting_Day: DAY_NAME_BY_NUMBER.get(slot.dayOfWeek),
      Preferred_Starting_Hour: minutesToFetHour(slot.startTime),
    })),
    Active: true,
    Comments: "",
  };
}

function getActivityRoomConstraints(activity: FetActivity) {
  if (activity.fixedRoomId) {
    return {
      ConstraintActivityPreferredRoom: {
        Weight_Percentage: 100,
        Activity_Id: activity.id,
        Room: activity.fixedRoomId,
        Permanently_Locked: true,
        Active: true,
        Comments: "",
      },
    };
  }

  if (activity.roomIds.length === 0) return null;

  return {
    ConstraintActivityPreferredRooms: {
      Weight_Percentage: 100,
      Activity_Id: activity.id,
      Number_of_Preferred_Rooms: activity.roomIds.length,
      Preferred_Room: activity.roomIds,
      Active: true,
      Comments: "",
    },
  };
}

function getTeacherNotAvailableConstraints(input: FetInput) {
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

      return {
        Weight_Percentage: 100,
        Teacher: availability.teacherId,
        Number_of_Not_Available_Times: slots.length,
        Not_Available_Time: slots.map((slot) => ({
          Day: DAY_NAME_BY_NUMBER.get(slot.dayOfWeek),
          Hour: minutesToFetHour(slot.startTime),
        })),
        Active: true,
        Comments: "",
      };
    });
}

function getActiveStudentSetIds(input: FetInput, activeGroupIds: string[]): Set<string> {
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const activeStudentSetIds = new Set(activeGroupIds);

  for (const groupId of activeGroupIds) {
    let current = groupsById.get(groupId);

    while (current?.parentId) {
      activeStudentSetIds.add(current.parentId);
      current = groupsById.get(current.parentId);
    }
  }

  return activeStudentSetIds;
}

function getStudentsStructure(input: FetInput, activeGroupIds: string[]) {
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const activeStudentSetIds = getActiveStudentSetIds(input, activeGroupIds);
  const rootGroups = input.groups
    .filter((group) => activeStudentSetIds.has(group.id) && !group.parentId)
    .sort((left, right) => (left.grade ?? 0) - (right.grade ?? 0) || left.name.localeCompare(right.name, "ru"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildGroup = (groupId: string, depth: number): any => {
    const group = groupsById.get(groupId);
    if (!group) return null;

    const children = input.groups
      .filter((candidate) => candidate.parentId === group.id && activeStudentSetIds.has(candidate.id))
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));

    const tagName = depth === 0 ? "Year" : depth === 1 ? "Group" : "Subgroup";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      Name: group.id,
      Number_of_Students: 0,
      Comments: group.name,
    };

    if (depth < 2 && children.length > 0) {
      const childTagName = depth === 0 ? "Group" : "Subgroup";
      data[childTagName] = children.map((child) => buildGroup(child.id, depth + 1)[childTagName]);
    }

    return { [tagName]: data };
  };

  return rootGroups.map((group) => buildGroup(group.id, 0).Year);
}

export function buildFetXml(
  input: FetInput,
  activities: FetActivity[],
  options: { includeStudentGapConstraints?: boolean } = {},
): string {
  const activeGroupIds = unique(activities.map((activity) => activity.groupId));
  const activeSubjectIds = unique(activities.map((activity) => activity.subjectId));
  const activeTeacherIds = unique(
    activities.map((activity) => activity.teacherId).filter((teacherId): teacherId is string => Boolean(teacherId)),
  );
  const activeRoomIds = unique(activities.flatMap((activity) => activity.fixedRoomId ? [activity.fixedRoomId] : activity.roomIds));
  const subjectsById = new Map(input.subjects.map((subject) => [subject.id, subject]));
  const roomsById = new Map(input.rooms.map((room) => [room.id, room]));
  const hours = getHours();

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    suppressEmptyNode: true,
  });

  const roomConstraints = activities
    .map(getActivityRoomConstraints)
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const fetObject = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    fet: {
      "@_version": "6.25.0",
      Mode: "Official",
      Institution_Name: "ClassFlow",
      Comments: "",
      Days_List: {
        Number_of_Days: FET_DAYS.length,
        Day: FET_DAYS.map((day) => ({ Name: day.name })),
      },
      Hours_List: {
        Number_of_Hours: hours.length,
        Hour: hours.map((hour) => ({ Name: hour })),
      },
      Subjects_List: {
        Subject: activeSubjectIds.map((subjectId) => ({
          Name: subjectId,
          Comments: subjectsById.get(subjectId)?.name ?? subjectId,
        })),
      },
      Teachers_List: {
        Teacher: activeTeacherIds.map((teacherId) => ({
          Name: teacherId,
          Target_Number_of_Hours: 0,
          Qualified_Subjects: "",
          Comments: "",
        })),
      },
      Students_List: {
        Year: getStudentsStructure(input, activeGroupIds),
      },
      Activities_List: {
        Activity: activities.map((activity) => ({
          Teacher: activity.teacherId ? [activity.teacherId] : undefined,
          Subject: activity.subjectId,
          Students: activity.groupId,
          Duration: periodCount(activity.durationInMinutes),
          Total_Duration: periodCount(activity.durationInMinutes),
          Id: activity.id,
          Activity_Group_Id: 0,
          Active: true,
          Comments: activity.source,
        })),
      },
      Buildings_List: "",
      Rooms_List: {
        Room: activeRoomIds.map((roomId) => ({
          Name: roomId,
          Building: "",
          Capacity: 0,
          Virtual: false,
          Comments: roomsById.get(roomId)?.name ?? roomId,
        })),
      },
      Time_Constraints_List: {
        ConstraintBasicCompulsoryTime: {
          Weight_Percentage: 100,
          Active: true,
          Comments: "",
        },
        ConstraintActivityPreferredStartingTimes: activities.map(getActivityStartingTimes),
        ConstraintTeacherNotAvailableTimes: getTeacherNotAvailableConstraints(input),
        ...(options.includeStudentGapConstraints && FET_STUDENTS_MAX_GAPS_WEIGHT > 0
          ? {
              ConstraintStudentsMaxGapsPerWeek: {
                Weight_Percentage: FET_STUDENTS_MAX_GAPS_WEIGHT,
                Max_Gaps: FET_STUDENTS_MAX_GAPS_PER_WEEK,
                Active: true,
                Comments: "Soft preference: keep student days compact",
              },
            }
          : {}),
      },
      Space_Constraints_List: {
        ConstraintBasicCompulsorySpace: {
          Weight_Percentage: 100,
          Active: true,
          Comments: "",
        },
        ...roomConstraints.reduce((acc, curr) => {
          if ("ConstraintActivityPreferredRoom" in curr) {
            acc.ConstraintActivityPreferredRoom = acc.ConstraintActivityPreferredRoom || [];
            acc.ConstraintActivityPreferredRoom.push(curr.ConstraintActivityPreferredRoom);
          } else {
            acc.ConstraintActivityPreferredRooms = acc.ConstraintActivityPreferredRooms || [];
            acc.ConstraintActivityPreferredRooms.push(curr.ConstraintActivityPreferredRooms);
          }
          return acc;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, {} as any),
      },
    },
  };

  return builder.build(fetObject);
}
