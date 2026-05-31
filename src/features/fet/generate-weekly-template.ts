import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { buildCoreActivities } from "./build-core-activities";
import { buildFullActivities, buildLockedCoreActivities } from "./build-full-activities";
import { buildRegimeActivities } from "./build-regime-activities";
import { collectFetInput } from "./collect-input";
import { assertFetEnvironment } from "./env";
import { assertActivityInsideSlots, importFetActivitiesXml, mapImportedActivitiesToTemplateRows } from "./importer";
import { preflightFetInput } from "./preflight";
import { readFetActivitiesXml, runFetCliPass } from "./runner";
import type {
  FetInput,
  FetActivity,
  FetRunRequest,
  FetRunResult,
  GenerateWeeklyScheduleTemplateResult,
} from "./types";

type FetRunner = (request: FetRunRequest) => Promise<FetRunResult>;
type ReadActivitiesXml = (filePath: string) => Promise<string>;

type GenerateWeeklyScheduleTemplateOptions = {
  prismaClient?: PrismaClient;
  input?: FetInput;
  runner?: FetRunner;
  readActivitiesXml?: ReadActivitiesXml;
  artifactId?: string;
};

export async function generateWeeklyScheduleTemplate(
  options: GenerateWeeklyScheduleTemplateOptions = {},
): Promise<GenerateWeeklyScheduleTemplateResult> {
  assertFetEnvironment();

  const db = options.prismaClient ?? prisma;
  const input = options.input ?? await collectFetInput();
  const runner = options.runner ?? runFetCliPass;
  const readXml = options.readActivitiesXml ?? readFetActivitiesXml;
  const artifactId = options.artifactId ?? randomUUID();

  preflightFetInput(input);

  const coreActivities = buildCoreActivities(input);
  const warnings: string[] = [];
  let lockedCoreActivities: FetActivity[] = [];

  if (coreActivities.length > 0) {
    const coreRun = await runner({
      kind: "core",
      artifactId,
      activities: coreActivities,
      input,
    });
    warnings.push(...coreRun.warnings);

    const coreXml = await readXml(coreRun.outputActivitiesXmlPath);
    const importedCore = importFetActivitiesXml(coreXml);
    const coreActivityById = new Map(coreActivities.map((activity) => [activity.id, activity]));
    for (const importedActivity of importedCore) {
      const activity = coreActivityById.get(importedActivity.activityId);
      if (activity) {
        assertActivityInsideSlots(activity, importedActivity);
      }
    }

    lockedCoreActivities = buildLockedCoreActivities(coreActivities, importedCore);
  }

  const { activities: fullActivities, ordinaryActivityCount } = buildFullActivities(input, lockedCoreActivities);

  if (fullActivities.length === 0) {
    throw new Error("Нет занятий для генерации: заполните учебный план в GroupSubjectRequirement");
  }

  const fullRun = await runner({
    kind: "full",
    artifactId,
    activities: fullActivities,
    input,
  });
  warnings.push(...fullRun.warnings);

  const fullXml = await readXml(fullRun.outputActivitiesXmlPath);
  const importedFull = importFetActivitiesXml(fullXml);
  const importedRows = mapImportedActivitiesToTemplateRows(fullActivities, importedFull);

  const transactionResult = await db.$transaction(async (tx) => {
    const deleted = await tx.weeklyScheduleTemplate.deleteMany({});

    if (importedRows.length > 0) {
      await tx.weeklyScheduleTemplate.createMany({
        data: importedRows.map((row) => ({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          subjectId: row.subjectId,
          roomId: row.roomId,
          teacherId: row.teacherId,
          deliveryMode: "DIRECT_GROUP" as const,
          deliveryGroupId: row.groupId,
          attendanceLoadModeOverride: null,
        })),
      });
    }

    return deleted;
  });

  return {
    deletedTemplateCount: transactionResult.count,
    insertedTemplateCount: importedRows.length,
    regimeActivityCount: buildRegimeActivities(input).length,
    ordinaryActivityCount,
    warnings,
    artifactId,
  };
}
