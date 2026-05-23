import type { AssignmentDocument } from "../assignments/assignment.model.js";

export function buildGenerationPrompt(assignment: AssignmentDocument) {
  return {
    role: "teacher-assessment-generator",
    task: "Create a structured exam paper as strict JSON.",
    assignment: {
      title: assignment.title,
      subject: assignment.subject,
      grade: assignment.grade,
      dueDate: assignment.dueDate.toISOString(),
      questionConfig: assignment.questionConfig,
      additionalInstructions: assignment.additionalInstructions,
      sourceText: assignment.sourceText,
    },
    outputSchema: {
      paperTitle: "string",
      subject: "string",
      grade: "string",
      timeAllowed: "string",
      maximumMarks: "number",
      sections: [
        {
          id: "string",
          title: "string",
          instruction: "string",
          questions: [
            {
              id: "string",
              text: "string",
              type: "string",
              difficulty: "easy | medium | hard",
              marks: "number",
              answerKey: "string optional",
            },
          ],
        },
      ],
    },
  };
}
