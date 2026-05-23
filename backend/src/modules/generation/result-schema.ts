import { z } from "zod";

export const generatedPaperSchema = z.object({
  paperTitle: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  timeAllowed: z.string().optional(),
  maximumMarks: z.number().int().positive(),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      instruction: z.string().min(1),
      questions: z.array(
        z.object({
          id: z.string().min(1),
          text: z.string().min(1),
          type: z.string().min(1),
          difficulty: z.enum(["easy", "medium", "hard"]),
          marks: z.number().int().positive(),
          answerKey: z.string().optional(),
        }),
      ),
    }),
  ),
});

export type GeneratedPaper = z.infer<typeof generatedPaperSchema>;
