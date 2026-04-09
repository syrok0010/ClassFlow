"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserFullName } from "@/lib/auth-access";
import { getActionErrorMessage } from "@/lib/action-error";
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

const AUTH_ERROR_MESSAGE = "Недостаточно прав для выполнения действия";

type TeacherScope =
  | {
      role: "admin";
      teacherId: null;
    }
  | {
      role: "teacher";
      teacherId: string;
    };

async function getTeacherScope(): Promise<Result<TeacherScope>> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return err("Требуется авторизация");
  }

  if (session.user.role === "ADMIN") {
    return ok({ role: "admin", teacherId: null });
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

  return ok({ role: "teacher", teacherId: teacher.id });
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

function revalidateTeachingPath(userId: string) {
  revalidatePath(`/admin/users/${userId}/teaching`);
}

export async function getTeachingPageDataAction(userId: string): Promise<Result<TeachingPageData>> {
  try {
    const scopeResponse = await getTeacherScope();
    if (scopeResponse.error || !scopeResponse.result) {
      return err(scopeResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    if (scopeResponse.result.role === "teacher") {
      const currentTeacher = await prisma.teacher.findUnique({
        where: { id: scopeResponse.result.teacherId },
        select: { userId: true },
      });

      if (!currentTeacher || currentTeacher.userId !== userId) {
        return err(AUTH_ERROR_MESSAGE);
      }
    }

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
    return err(getActionErrorMessage(error, "Не удалось загрузить компетенции преподавателя"));
  }
}

export async function createTeacherSubjectAction(
  input: CreateTeacherSubjectInput
): Promise<Result<TeacherSubjectRow>> {
  try {
    const scopeResponse = await getTeacherScope();
    if (scopeResponse.error || !scopeResponse.result) {
      return err(scopeResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    const validated = createTeacherSubjectSchema.parse(input);
    const teacherId =
      scopeResponse.result.role === "teacher"
        ? scopeResponse.result.teacherId
        : validated.teacherId;

    if (!teacherId) {
      return err(AUTH_ERROR_MESSAGE);
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { userId: true },
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

    revalidateTeachingPath(teacher.userId);
    return ok(mapTeacherSubjectRow(created));
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при добавлении компетенции"));
  }
}

export async function updateTeacherSubjectAction(
  key: TeacherSubjectKeyInput,
  input: UpdateTeacherSubjectInput
): Promise<Result<TeacherSubjectRow>> {
  try {
    const scopeResponse = await getTeacherScope();
    if (scopeResponse.error || !scopeResponse.result) {
      return err(scopeResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    const validatedKey = teacherSubjectKeySchema.parse(key);
    const validatedInput = updateTeacherSubjectSchema.parse(input);
    const teacherId =
      scopeResponse.result.role === "teacher"
        ? scopeResponse.result.teacherId
        : validatedKey.teacherId;

    if (!teacherId) {
      return err(AUTH_ERROR_MESSAGE);
    }

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

    revalidateTeachingPath(existing.teacher.userId);
    return ok(mapTeacherSubjectRow(updated));
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при обновлении диапазона классов"));
  }
}

export async function deleteTeacherSubjectAction(
  key: TeacherSubjectKeyInput
): Promise<Result<true>> {
  try {
    const scopeResponse = await getTeacherScope();
    if (scopeResponse.error || !scopeResponse.result) {
      return err(scopeResponse.error ?? AUTH_ERROR_MESSAGE);
    }

    const validated = teacherSubjectKeySchema.parse(key);
    const teacherId =
      scopeResponse.result.role === "teacher"
        ? scopeResponse.result.teacherId
        : validated.teacherId;

    if (!teacherId) {
      return err(AUTH_ERROR_MESSAGE);
    }

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

    revalidateTeachingPath(existing.teacher.userId);
    return ok(true);
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при удалении компетенции"));
  }
}
