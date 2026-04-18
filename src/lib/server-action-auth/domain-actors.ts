import { forbidden, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "./context";
import type { ActionContext, ParentActor, StudentActor, TeacherActor } from "./types";

export async function requireTeacherActor(context?: ActionContext): Promise<TeacherActor> {
  const resolvedContext = context ?? (await requireActionContext());

  if (!resolvedContext.domainRoles.includes("teacher")) {
    forbidden();
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: resolvedContext.userId },
    select: { id: true },
  });

  if (!teacher) {
    notFound();
  }

  return {
    userId: resolvedContext.userId,
    teacherId: teacher.id,
  };
}

export async function requireParentActor(context?: ActionContext): Promise<ParentActor> {
  const resolvedContext = context ?? (await requireActionContext());

  if (!resolvedContext.domainRoles.includes("parent")) {
    forbidden();
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: resolvedContext.userId },
    select: { id: true },
  });

  if (!parent) {
    notFound();
  }

  return {
    userId: resolvedContext.userId,
    parentId: parent.id,
  };
}

export async function requireStudentActor(context?: ActionContext): Promise<StudentActor> {
  const resolvedContext = context ?? (await requireActionContext());

  if (!resolvedContext.domainRoles.includes("student")) {
    forbidden();
  }

  const student = await prisma.student.findFirst({
    where: { userId: resolvedContext.userId },
    select: { id: true },
  });

  if (!student) {
    notFound();
  }

  return {
    userId: resolvedContext.userId,
    studentId: student.id,
  };
}
