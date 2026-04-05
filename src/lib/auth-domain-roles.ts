import { prisma } from "./prisma";
import type { DomainRole } from "./auth-access";

export async function getUserDomainRoles(userId: string): Promise<DomainRole[]> {
  const counts = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      _count: {
        select: {
          teachers: true,
          parents: true,
          students: true,
        },
      },
    },
  });

  const domainRoles: DomainRole[] = [];

  if (counts?._count.teachers) domainRoles.push("teacher");
  if (counts?._count.parents) domainRoles.push("parent");
  if (counts?._count.students) domainRoles.push("student");

  return domainRoles;
}
