import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { buildFullActivities, buildLockedRegimeActivities } from "./build-full-activities";
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

  const regimeActivities = buildRegimeActivities(input);
  const warnings: string[] = [];
  let lockedRegimeActivities: FetActivity[] = [];

  if (regimeActivities.length > 0) {
    const regimeRun = await runner({
      kind: "regime",
      artifactId,
      activities: regimeActivities,
      input,
    });
    warnings.push(...regimeRun.warnings);

    const regimeXml = await readXml(regimeRun.outputActivitiesXmlPath);
    const importedRegime = importFetActivitiesXml(regimeXml);
    const regimeActivityById = new Map(regimeActivities.map((activity) => [activity.id, activity]));
    for (const importedActivity of importedRegime) {
      const activity = regimeActivityById.get(importedActivity.activityId);
      if (activity) {
        assertActivityInsideSlots(activity, importedActivity);
      }
    }

    lockedRegimeActivities = buildLockedRegimeActivities(input, regimeActivities, importedRegime);
  }

  const { activities: fullActivities, ordinaryActivityCount } = buildFullActivities(input, lockedRegimeActivities);

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
        data: importedRows,
      });
    }

    return deleted;
  });

  return {
    deletedTemplateCount: transactionResult.count,
    insertedTemplateCount: importedRows.length,
    regimeActivityCount: regimeActivities.length,
    ordinaryActivityCount,
    warnings,
    artifactId,
  };
}
