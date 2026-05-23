import { AssignmentModel } from "./assignment.model.js";
import type { CreateAssignmentInput } from "./assignment.validation.js";
import { generationQueue } from "../generation/generation.queue.js";

export async function createAssignment(input: CreateAssignmentInput) {
  const assignment = await AssignmentModel.create({
    ...input,
    dueDate: new Date(input.dueDate),
    status: "queued",
  });

  const job = await generationQueue.add(
    "generate-assessment",
    { assignmentId: assignment.id },
    { attempts: 2, removeOnComplete: true, removeOnFail: false },
  );

  assignment.jobId = job.id;
  await assignment.save();

  return assignment;
}

export async function listAssignments() {
  return AssignmentModel.find().sort({ createdAt: -1 }).lean();
}

export async function getAssignment(assignmentId: string) {
  return AssignmentModel.findById(assignmentId).lean();
}
