import { format, isValid, parse, parseISO, startOfDay } from "date-fns";
import { z } from "zod/v4";

const DATE_ERROR = "Укажите дату в формате ДД/ММ/ГГГГ";
const DATE_RANGE_ERROR = "Дата окончания должна быть не раньше даты начала";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, DATE_ERROR)
  .refine((value) => {
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
  }, DATE_ERROR);

export const applyWeeklyScheduleTemplateEditorSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .superRefine((value, context) => {
    const startDate = parseISO(value.startDate);
    const endDate = parseISO(value.endDate);

    if (endDate < startDate) {
      context.addIssue({
        code: "custom",
        message: DATE_RANGE_ERROR,
        path: ["endDate"],
      });
    }
  });

export const applyWeeklyScheduleTemplateActionSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: DATE_RANGE_ERROR,
    path: ["endDate"],
  });

export function mapApplyTemplateEditorToActionInput(
  value: ApplyWeeklyScheduleTemplateEditorInput,
): ApplyWeeklyScheduleTemplateInput {
  return {
    startDate: startOfDay(parseISO(value.startDate)),
    endDate: startOfDay(parseISO(value.endDate)),
  };
}

export type ApplyWeeklyScheduleTemplateEditorInput = z.infer<
  typeof applyWeeklyScheduleTemplateEditorSchema
>;
export type ApplyWeeklyScheduleTemplateInput = z.infer<
  typeof applyWeeklyScheduleTemplateActionSchema
>;
