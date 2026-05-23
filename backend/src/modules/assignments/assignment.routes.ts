import { Router } from "express";
import { createAssignment, getAssignment, listAssignments } from "./assignment.service.js";
import { createAssignmentSchema } from "./assignment.validation.js";
import { AssignmentModel } from "./assignment.model.js";

export const assignmentRouter = Router();

assignmentRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ assignments: await listAssignments() });
  } catch (error) {
    next(error);
  }
});

assignmentRouter.post("/", async (req, res, next) => {
  try {
    const input = createAssignmentSchema.parse(req.body);
    const assignment = await createAssignment(input);

    res.status(201).json({
      assignmentId: assignment.id,
      jobId: assignment.jobId,
      status: assignment.status,
    });
  } catch (error) {
    next(error);
  }
});

import { generationQueue } from "../generation/generation.queue.js";

assignmentRouter.get("/:assignmentId", async (req, res, next) => {
  try {
    const assignment = await getAssignment(req.params.assignmentId);

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});

assignmentRouter.delete("/:assignmentId", async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const result = await AssignmentModel.findByIdAndDelete(assignmentId);
    if (!result) {
      res.status(404).json({ success: false, error: "Assignment not found" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

assignmentRouter.post("/:assignmentId/regenerate", async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ success: false, error: "Assignment not found" });
      return;
    }
    if ((assignment.regenerateCount || 0) >= 5) {
      res.status(400).json({ success: false, error: "Maximum regeneration limit reached" });
      return;
    }

    assignment.status = "queued";
    assignment.regenerateCount = (assignment.regenerateCount || 0) + 1;
    await assignment.save();

    const job = await generationQueue.add(
      "generate-assessment",
      { assignmentId: assignment.id },
      { attempts: 2, removeOnComplete: true, removeOnFail: false },
    );

    assignment.jobId = job.id;
    await assignment.save();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
