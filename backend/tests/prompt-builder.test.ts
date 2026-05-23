import { describe, expect, it } from "vitest";
import { buildGenerationPrompt } from "../src/modules/generation/prompt-builder.js";
import type { AssignmentDocument } from "../src/modules/assignments/assignment.model.js";

describe("buildGenerationPrompt", () => {
  it("keeps assignment inputs structured for Gemini generation", () => {
    const assignment = {
      title: "Electricity Quiz",
      subject: "Science",
      grade: "Class 5",
      dueDate: new Date("2026-06-01T00:00:00.000Z"),
      questionConfig: [{ type: "short-answer", count: 5, marks: 2 }],
    } as AssignmentDocument;

    const prompt = buildGenerationPrompt(assignment);

    expect(prompt.assignment.title).toBe("Electricity Quiz");
    expect(prompt.assignment.questionConfig).toHaveLength(1);
    expect(prompt.outputSchema.sections[0].questions[0].difficulty).toBe(
      "easy | medium | hard",
    );
  });
});
