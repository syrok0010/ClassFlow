import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../src/generated/prisma/client.js";

export async function clearSeedData(prisma: PrismaClient) {
  await prisma.scheduleEntry.deleteMany();
  await prisma.weeklyScheduleTemplate.deleteMany();
  await prisma.teacherAvailabilityOverride.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.groupSubjectRequirement.deleteMany();
  await prisma.roomSubject.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.studentGroups.deleteMany();
  await prisma.group.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.studentParents.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}

export async function createCredentialAccount(
  prisma: PrismaClient,
  userId: string,
  password: string,
) {
  await prisma.account.create({
    data: {
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword(password),
    },
  });
}
