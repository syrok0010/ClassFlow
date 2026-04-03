"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import {
  createTeacherSubjectSchema,
  teacherSubjectKeySchema,
  updateTeacherSubjectSchema,
  type CreateTeacherSubjectInput,
  type TeacherSubjectKeyInput,
  type UpdateTeacherSubjectInput,
} from "../_lib/schemas";
import type { SubjectOption, TeacherIdentity, TeacherSubjectRow, TeachingPageData } from "../_lib/types";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatFullName(user: {
  surname: string | null;
  name: string | null;
  patronymicName: string | null;
}): string {
  const fullName = [user.surname, user.name, user.patronymicName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || "Без имени";
}

function mapTeacherIdentity(user: {
  id: string;
  email: string | null;
  status: TeacherIdentity["status"];
  surname: string | null;
  name: string | null;
  patronymicName: string | null;
  teachers: { id: string }[];
  students: { id: string }[];
  parents: { id: string }[];
}): TeacherIdentity {
  const roleLabels = [
    user.teachers.length > 0 ? "Учитель" : null,
    user.students.length > 0 ? "Ученик" : null,
    user.parents.length > 0 ? "Родитель" : null,
  ].filter((role): role is string => Boolean(role));

  return {
    userId: user.id,
    teacherId: user.teachers[0].id,
    email: user.email,
    status: user.status,
    fullName: formatFullName(user),
    roleLabels,
  };
}

function mapTeacherSubjectRow(row: {
  teacherId: string;
  subjectId: string;
  minGrade: number | null;
  maxGrade: number | null;
  subject: {
    name: string;
    type: TeacherSubjectRow["subjectType"];
  };
}): TeacherSubjectRow {
  return {
    teacherId: row.teacherId,
    subjectId: row.subjectId,
    subjectName: row.subject.name,
    subjectType: row.subject.type,
    minGrade: row.minGrade,
    maxGrade: row.maxGrade,
  };
}

async function revalidateTeachingPathByTeacherId(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });

  if (!teacher) {
    return;
  }

  revalidatePath(`/admin/users/${teacher.userId}/teaching`);
}

export async function getTeachingPageDataAction(userId: string): Promise<Result<TeachingPageData>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        surname: true,
        name: true,
        patronymicName: true,
        teachers: { select: { id: true } },
        students: { select: { id: true } },
        parents: { select: { id: true } },
      },
    });

    if (!user) {
      return err("Пользователь не найден");
    }

    if (user.teachers.length === 0) {
      return err("У пользователя нет роли преподавателя");
    }

    const teacherId = user.teachers[0].id;

    const [teacherSubjectsRows, subjectOptions] = await Promise.all([
      prisma.teacherSubject.findMany({
        where: { teacherId },
        include: {
          subject: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: [{ subject: { name: "asc" } }],
      }),
      prisma.subject.findMany({
        select: {
          id: true,
          name: true,
          type: true,
        },
        orderBy: [{ name: "asc" }],
      }),
    ]);

    const teacher = mapTeacherIdentity(user);
    const teacherSubjects = teacherSubjectsRows.map(mapTeacherSubjectRow);
    const options: SubjectOption[] = subjectOptions;

    return ok({
      teacher,
      teacherSubjects,
      subjectOptions: options,
    });
  } catch (error) {
    return err(getErrorMessage(error, "Не удалось загрузить компетенции преподавателя"));
  }
}

export async function createTeacherSubjectAction(
  input: CreateTeacherSubjectInput
): Promise<Result<TeacherSubjectRow>> {
  try {
    const validated = createTeacherSubjectSchema.parse(input);

    const teacher = await prisma.teacher.findUnique({
      where: { id: validated.teacherId },
      select: { id: true },
    });

    if (!teacher) {
      return err("Преподаватель не найден");
    }

    const subject = await prisma.subject.findUnique({
      where: { id: validated.subjectId },
      select: { id: true },
    });

    if (!subject) {
      return err("Предмет не найден");
    }

    const duplicate = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId: validated.teacherId,
          subjectId: validated.subjectId,
        },
      },
      select: { teacherId: true },
    });

    if (duplicate) {
      return err("Этот предмет уже назначен преподавателю");
    }

    const created = await prisma.teacherSubject.create({
      data: {
        teacherId: validated.teacherId,
        subjectId: validated.subjectId,
        minGrade: validated.minGrade,
        maxGrade: validated.maxGrade,
      },
      include: {
        subject: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    await revalidateTeachingPathByTeacherId(validated.teacherId);
    return ok(mapTeacherSubjectRow(created));
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при добавлении компетенции"));
  }
}

export async function updateTeacherSubjectAction(
  key: TeacherSubjectKeyInput,
  input: UpdateTeacherSubjectInput
): Promise<Result<TeacherSubjectRow>> {
  try {
    const validatedKey = teacherSubjectKeySchema.parse(key);
    const validatedInput = updateTeacherSubjectSchema.parse(input);

    const existing = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId: validatedKey.teacherId,
          subjectId: validatedKey.subjectId,
        },
      },
      select: {
        teacherId: true,
      },
    });

    if (!existing) {
      return err("Связь преподавателя с предметом не найдена");
    }

    const updated = await prisma.teacherSubject.update({
      where: {
        teacherId_subjectId: {
          teacherId: validatedKey.teacherId,
          subjectId: validatedKey.subjectId,
        },
      },
      data: {
        minGrade: validatedInput.minGrade,
        maxGrade: validatedInput.maxGrade,
      },
      include: {
        subject: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    await revalidateTeachingPathByTeacherId(validatedKey.teacherId);
    return ok(mapTeacherSubjectRow(updated));
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при обновлении диапазона классов"));
  }
}

export async function deleteTeacherSubjectAction(
  key: TeacherSubjectKeyInput
): Promise<Result<true>> {
  try {
    const validated = teacherSubjectKeySchema.parse(key);

    const existing = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId: validated.teacherId,
          subjectId: validated.subjectId,
        },
      },
      select: { teacherId: true },
    });

    if (!existing) {
      return err("Связь преподавателя с предметом не найдена");
    }

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId: {
          teacherId: validated.teacherId,
          subjectId: validated.subjectId,
        },
      },
    });

    await revalidateTeachingPathByTeacherId(validated.teacherId);
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при удалении компетенции"));
  }
}
