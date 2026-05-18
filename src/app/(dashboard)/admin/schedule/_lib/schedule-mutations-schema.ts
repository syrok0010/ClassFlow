import { z } from "zod";

export const adminScheduleTemplateMutationSchema = z.object({
  templateId: z.string().optional(),
  dayOfWeek: z.number().int().min(1).max(5).nullable(),
  startMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable(),
  endMinutes: z.number().int().min(1).max(24 * 60).nullable(),
  deliveryMode: z.enum(["DIRECT_GROUP", "ELECTIVE_GROUP", "SHARED_CLASSES"]),
  deliveryGroupId: z.string().nullable(),
  openClassIds: z.array(z.string().min(1)).default([]),
  coveredClassIds: z.array(z.string().min(1)).default([]),
  subjectId: z.string().min(1),
  roomId: z.string().nullable(),
  teacherId: z.string().nullable(),
});

export type AdminScheduleTemplateMutationInput = z.infer<typeof adminScheduleTemplateMutationSchema>;
