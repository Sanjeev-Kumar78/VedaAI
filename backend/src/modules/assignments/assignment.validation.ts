import { z } from "zod";

export const questionTypeConfigSchema = z.object({
  type: z.string().min(1),
  count: z.number().int().positive(),
  marks: z.number().int().positive(),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  dueDate: z.string().datetime(),
  questionConfig: z.array(questionTypeConfigSchema).min(1),
  additionalInstructions: z.string().max(4000).optional(),
  sourceText: z.string().max(20000).optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
