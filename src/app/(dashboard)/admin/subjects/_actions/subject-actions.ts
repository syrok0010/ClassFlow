"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import type { SubjectType } from "@/generated/prisma/client";
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
  SubjectWithUsage,
} from "../_lib/types";
import { SUBJECT_TYPE_ORDER } from "../_lib/constants";

const SUBJECTS_PATH = "/admin/subjects";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function applyFilters(subjects: SubjectWithUsage[], filters: SubjectListFilters) {
  const search = filters.search?.trim().toLowerCase();

  const filtered = subjects.filter((subject) => {
    const typeMatches = !filters.type || subject.type === filters.type;
    const searchMatches = !search || subject.name.toLowerCase().includes(search);

    return typeMatches && searchMatches;
  });

  if (filters.sort === "type") {
    return filtered.sort((a, b) => {
      const typeDelta =
        SUBJECT_TYPE_ORDER.indexOf(a.type) - SUBJECT_TYPE_ORDER.indexOf(b.type);

      if (typeDelta !== 0) {
        return typeDelta;
      }

      return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
    });
  }

  return filtered.sort((a, b) =>
    a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
  );
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
    return err(getErrorMessage(error, "Не удалось загрузить список предметов"));
  }
}

export async function createSubjectAction(data: CreateSubjectInput) {
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
    return err(getErrorMessage(error, "Ошибка при создании предмета"));
  }
}

export async function updateSubjectAction(id: IdInput, data: UpdateSubjectInput) {
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
    return err(getErrorMessage(error, "Ошибка при обновлении предмета"));
  }
}

export async function getSubjectDeleteGuardsAction(
  id: IdInput
): Promise<Result<SubjectDeleteGuards>> {
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
    return err(getErrorMessage(error, "Не удалось проверить связи предмета"));
  }
}

export async function deleteSubjectAction(id: IdInput): Promise<Result<true>> {
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
    return err(getErrorMessage(error, "Ошибка при удалении предмета"));
  }
}
