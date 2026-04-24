"use server";

import { revalidatePath } from "next/cache";

import { getActionErrorMessage } from "@/lib/action-error";
import { err, ok, type Result } from "@/lib/result";
import { requireAdminContext } from "@/lib/server-action-auth";
import { generateWeeklyScheduleTemplate } from "@/features/fet/generate-weekly-template";
import type {
  GenerateWeeklyScheduleTemplateInput,
  GenerateWeeklyScheduleTemplateResult,
} from "@/features/fet/types";

export async function generateWeeklyScheduleTemplateAction(
  input: GenerateWeeklyScheduleTemplateInput,
): Promise<Result<GenerateWeeklyScheduleTemplateResult>> {
  await requireAdminContext();

  try {
    if (input.replaceExisting !== true) {
      return err("Генерация v0.3 поддерживает только замену существующего недельного шаблона");
    }

    const result = await generateWeeklyScheduleTemplate();
    revalidatePath("/admin/schedule");

    return ok(result);
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось сгенерировать расписание"));
  }
}
