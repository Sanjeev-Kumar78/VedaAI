import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis.js";

export const generationQueueName = "assessment-generation";

export type GenerationJobPayload = {
  assignmentId: string;
};

export const generationQueue = new Queue<GenerationJobPayload>(generationQueueName, {
  connection: createRedisConnection(),
});
