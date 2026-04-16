"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { getUserFullName } from "@/lib/auth-access";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import {
  createTeacherSubjectSchema,
  gradeRangeSchema,
  teacherSubjectKeySchema,
  teacherSubjectsQuerySchema,
  type CreateTeacherSubjectInput,
  type TeacherSubjectKeyInput,
  type TeacherSubjectsQueryInput,
  type UpdateTeacherSubjectInput,
} from "../lib/schemas";
import type {
  TeacherIdentity,
  TeacherSubjectsPageData,
  TeacherSubjectRow,
} from "../lib/types";

const AUTH_ERROR_MESSAGE = "Недостаточно прав для выполнения действия";

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
    fullName: getUserFullName(user),
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

async function resolveTeacherUserIdByTeacherId(teacherId?: string): Promise<Result<string | null>> {
  if (!teacherId) {
    return ok(null);
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });

  if (!teacher) {
    return err("Преподаватель не найден");
  }

  return ok(teacher.userId);
}

async function resolveAuthorizedTeacherId(requestedTeacherUserId: string | null): Promise<Result<string>> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return err("Требуется авторизация");
  }

  if (session.user.role === "ADMIN") {
    if (!requestedTeacherUserId) {
      return err(AUTH_ERROR_MESSAGE);
    }

    const teacher = await prisma.teacher.findFirst({
      where: { userId: requestedTeacherUserId },
      select: { id: true },
    });

    if (!teacher) {
      return err("Преподаватель не найден");
    }

    return ok(teacher.id);
  }

  if (!session.user.domainRoles?.includes("teacher")) {
    return err(AUTH_ERROR_MESSAGE);
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!teacher) {
    return err("Не найден профиль преподавателя");
  }

  if (requestedTeacherUserId && requestedTeacherUserId !== session.user.id) {
    return err(AUTH_ERROR_MESSAGE);
  }

  return ok(teacher.id);
}

export async function getTeacherSubjectsAction(
  input: TeacherSubjectsQueryInput = {}
): Promise<Result<TeacherSubjectsPageData>> {
  try {
    const validated = teacherSubjectsQuerySchema.parse(input);
    const teacherUserIdResponse = await resolveTeacherUserIdByTeacherId(validated.teacherId);
    if (teacherUserIdResponse.error) {
      return err(teacherUserIdResponse.error);
    }

    const teacherIdResponse = await resolveAuthorizedTeacherId(teacherUserIdResponse.result);

    if (teacherIdResponse.error || !teacherIdResponse.result) {
      return err(teacherIdResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    const teacherId = teacherIdResponse.result;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        user: {
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
        },
      },
    });

    if (!teacher) {
      return err("Преподаватель не найден");
    }

    if (teacher.user.teachers.length === 0) {
      return err("У пользователя нет роли преподавателя");
    }

    const search = validated.filters?.search?.trim();
    const where: Prisma.TeacherSubjectWhereInput = {
      teacherId,
      ...(validated.filters?.type || search
        ? {
            subject: {
              ...(validated.filters?.type ? { type: validated.filters.type } : {}),
              ...(search
                ? {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  }
                : {}),
            },
          }
        : {}),
    };

    const [teacherSubjectsRows, subjectOptions] = await Promise.all([
      prisma.teacherSubject.findMany({
        where,
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

    return ok({
      teacher: mapTeacherIdentity(teacher.user),
      teacherSubjects: teacherSubjectsRows.map(mapTeacherSubjectRow),
      subjectOptions,
    });
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить компетенции преподавателя"));
  }
}

export async function createTeacherSubjectAction(
  input: CreateTeacherSubjectInput
): Promise<Result<TeacherSubjectRow>> {
  try {
    const validated = createTeacherSubjectSchema.parse(input);
    const teacherUserIdResponse = await resolveTeacherUserIdByTeacherId(validated.teacherId);
    if (teacherUserIdResponse.error) {
      return err(teacherUserIdResponse.error);
    }

    const teacherIdResponse = await resolveAuthorizedTeacherId(teacherUserIdResponse.result);

    if (teacherIdResponse.error || !teacherIdResponse.result) {
      return err(teacherIdResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    const teacherId = teacherIdResponse.result;

    const [teacher, subject] = await Promise.all([
      prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { userId: true },
      }),
      prisma.subject.findUnique({
        where: { id: validated.subjectId },
        select: { id: true },
      }),
    ]);

    if (!teacher) {
      return err("Преподаватель не найден");
    }

    if (!subject) {
      return err("Предмет не найден");
    }

    const duplicate = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
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
        teacherId,
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

    revalidatePath(`/admin/users/${teacher.userId}/teaching`);
    revalidatePath("/teacher/subjects");

    return ok(mapTeacherSubjectRow(created));
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при добавлении компетенции"));
  }
}

export async function updateTeacherSubjectAction(
  input: TeacherSubjectKeyInput & UpdateTeacherSubjectInput
): Promise<Result<TeacherSubjectRow>> {
  try {
    const validatedKey = teacherSubjectKeySchema.parse(input);
    const validatedInput = gradeRangeSchema.parse(input);
    const teacherUserIdResponse = await resolveTeacherUserIdByTeacherId(validatedKey.teacherId);
    if (teacherUserIdResponse.error) {
      return err(teacherUserIdResponse.error);
    }

    const teacherIdResponse = await resolveAuthorizedTeacherId(teacherUserIdResponse.result);

    if (teacherIdResponse.error || !teacherIdResponse.result) {
      return err(teacherIdResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    const teacherId = teacherIdResponse.result;

    const existing = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId: validatedKey.subjectId,
        },
      },
      select: {
        teacher: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existing) {
      return err("Связь преподавателя с предметом не найдена");
    }

    const updated = await prisma.teacherSubject.update({
      where: {
        teacherId_subjectId: {
          teacherId,
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

    revalidatePath(`/admin/users/${existing.teacher.userId}/teaching`);
    revalidatePath("/teacher/subjects");

    return ok(mapTeacherSubjectRow(updated));
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при обновлении диапазона классов"));
  }
}

export async function deleteTeacherSubjectAction(
  key: TeacherSubjectKeyInput
): Promise<Result<true>> {
  try {
    const validated = teacherSubjectKeySchema.parse(key);
    const teacherUserIdResponse = await resolveTeacherUserIdByTeacherId(validated.teacherId);
    if (teacherUserIdResponse.error) {
      return err(teacherUserIdResponse.error);
    }

    const teacherIdResponse = await resolveAuthorizedTeacherId(teacherUserIdResponse.result);

    if (teacherIdResponse.error || !teacherIdResponse.result) {
      return err(teacherIdResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    const teacherId = teacherIdResponse.result;

    const existing = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId: validated.subjectId,
        },
      },
      select: {
        teacher: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existing) {
      return err("Связь преподавателя с предметом не найдена");
    }

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId: validated.subjectId,
        },
      },
    });

    revalidatePath(`/admin/users/${existing.teacher.userId}/teaching`);
    revalidatePath("/teacher/subjects");

    return ok(true);
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при удалении компетенции"));
  }
}
