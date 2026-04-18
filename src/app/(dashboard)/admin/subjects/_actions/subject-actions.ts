"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { getActionErrorMessage } from "@/lib/action-error";
import type { SubjectType } from "@/generated/prisma/client";
import { requireAdminContext } from "@/lib/server-action-auth";
import {
  createSubjectSchema,
  idSchema,
  updateSubjectSchema,
  type CreateSubjectInput,
  type IdInput,
  type UpdateSubjectInput,
} from "../_lib/subject-schemas";
import type {
  SubjectDeleteGuards,
  SubjectListFilters,
  SubjectUsageDetails,
  SubjectWithUsage,
} from "../_lib/types";

const SUBJECTS_PATH = "/admin/subjects";

function applyFilters(subjects: SubjectWithUsage[], filters: SubjectListFilters) {
  const search = filters.search?.trim().toLowerCase();

  const filtered = subjects.filter((subject) => {
    const typeMatches = !filters.type || subject.type === filters.type;
    const searchMatches = !search || subject.name.toLowerCase().includes(search);

    return typeMatches && searchMatches;
  });

  return filtered.sort((a, b) =>
    a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
  );
}

function formatTeacherName(teacher: {
  user: {
    surname: string | null;
    name: string | null;
    patronymicName: string | null;
  };
}) {
  const parts = [teacher.user.surname, teacher.user.name, teacher.user.patronymicName]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.join(" ") || "Без имени";
}

function toSubjectWithUsage(
  subject: {
    id: string;
    name: string;
    type: SubjectType;
    _count: {
      roomSubjects: number;
      groupSubjectRequirements: number;
      teacherSubjects: number;
      weeklyScheduleTemplates: number;
      scheduleEntries: number;
    };
  }
): SubjectWithUsage {
  return {
    id: subject.id,
    name: subject.name,
    type: subject.type,
    usage: {
      roomsCount: subject._count.roomSubjects,
      requirementsCount: subject._count.groupSubjectRequirements,
      teachersCount: subject._count.teacherSubjects,
      scheduleTemplatesCount: subject._count.weeklyScheduleTemplates,
      scheduleEntriesCount: subject._count.scheduleEntries,
    },
  };
}

function getDeleteGuardsFromUsage(usage: SubjectWithUsage["usage"]): SubjectDeleteGuards {
  return {
    roomsCount: usage.roomsCount,
    requirementsCount: usage.requirementsCount,
    teachersCount: usage.teachersCount,
    scheduleTemplatesCount: usage.scheduleTemplatesCount,
    scheduleEntriesCount: usage.scheduleEntriesCount,
  };
}

function hasDeleteDependencies(guards: SubjectDeleteGuards): boolean {
  return (
    guards.roomsCount > 0 ||
    guards.requirementsCount > 0 ||
    guards.teachersCount > 0 ||
    guards.scheduleTemplatesCount > 0 ||
    guards.scheduleEntriesCount > 0
  );
}

export async function getSubjectsAction(
  filters: SubjectListFilters = {}
): Promise<Result<SubjectWithUsage[]>> {
  await requireAdminContext();

  try {
    const subjects = await prisma.subject.findMany({
      include: {
        _count: {
          select: {
            roomSubjects: true,
            groupSubjectRequirements: true,
            teacherSubjects: true,
            weeklyScheduleTemplates: true,
            scheduleEntries: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const mapped = subjects.map(toSubjectWithUsage);
    return ok(applyFilters(mapped, filters));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить список предметов"));
  }
}

export async function createSubjectAction(data: CreateSubjectInput) {
  await requireAdminContext();

  try {
    const validated = createSubjectSchema.parse(data);

    const duplicate = await prisma.subject.findFirst({
      where: {
        name: {
          equals: validated.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return err("Предмет с таким названием уже существует");
    }

    const created = await prisma.subject.create({
      data: {
        name: validated.name,
        type: validated.type,
      },
    });

    revalidatePath(SUBJECTS_PATH);
    return ok(created);
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при создании предмета"));
  }
}

export async function updateSubjectAction(id: IdInput, data: UpdateSubjectInput) {
  await requireAdminContext();

  try {
    idSchema.parse(id);
    const validated = updateSubjectSchema.parse(data);

    const duplicate = await prisma.subject.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: validated.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return err("Предмет с таким названием уже существует");
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name: validated.name,
      },
    });

    revalidatePath(SUBJECTS_PATH);
    return ok(updated);
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при обновлении предмета"));
  }
}

export async function getSubjectDeleteGuardsAction(
  id: IdInput
): Promise<Result<SubjectDeleteGuards>> {
  await requireAdminContext();

  try {
    idSchema.parse(id);

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            roomSubjects: true,
            groupSubjectRequirements: true,
            teacherSubjects: true,
            weeklyScheduleTemplates: true,
            scheduleEntries: true,
          },
        },
      },
    });

    if (!subject) {
      return err("Предмет не найден");
    }

    return ok(
      getDeleteGuardsFromUsage({
        roomsCount: subject._count.roomSubjects,
        requirementsCount: subject._count.groupSubjectRequirements,
        teachersCount: subject._count.teacherSubjects,
        scheduleTemplatesCount: subject._count.weeklyScheduleTemplates,
        scheduleEntriesCount: subject._count.scheduleEntries,
      })
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось проверить связи предмета"));
  }
}

export async function getSubjectUsageDetailsAction(
  id: IdInput
): Promise<Result<SubjectUsageDetails>> {
  await requireAdminContext();

  try {
    idSchema.parse(id);

    const subject = await prisma.subject.findUnique({
      where: { id },
      select: {
        roomSubjects: {
          select: {
            room: {
              select: {
                name: true,
              },
            },
          },
        },
        teacherSubjects: {
          select: {
            teacher: {
              select: {
                user: {
                  select: {
                    surname: true,
                    name: true,
                    patronymicName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!subject) {
      return err("Предмет не найден");
    }

    const rooms = Array.from(new Set(subject.roomSubjects.map((item) => item.room.name))).sort(
      (a, b) => a.localeCompare(b, "ru", { sensitivity: "base" })
    );
    const teachers = Array.from(
      new Set(subject.teacherSubjects.map((item) => formatTeacherName(item.teacher)))
    ).sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base" }));

    return ok({ rooms, teachers });
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить данные использования"));
  }
}

export async function deleteSubjectAction(id: IdInput): Promise<Result<true>> {
  await requireAdminContext();

  try {
    idSchema.parse(id);

    const guardsResponse = await getSubjectDeleteGuardsAction(id);
    if (guardsResponse.error || !guardsResponse.result) {
      return err(guardsResponse.error ?? "Не удалось проверить связи предмета");
    }

    if (hasDeleteDependencies(guardsResponse.result)) {
      return err(
        "Невозможно удалить предмет, пока он используется в других разделах системы."
      );
    }

    await prisma.subject.delete({ where: { id } });

    revalidatePath(SUBJECTS_PATH);
    return ok(true);
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при удалении предмета"));
  }
}
