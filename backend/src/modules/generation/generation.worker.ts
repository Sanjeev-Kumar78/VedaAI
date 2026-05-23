import { Worker } from "bullmq";
import { createRedisConnection } from "../../config/redis.js";
import { connectMongo } from "../../config/mongo.js";
import { AssignmentModel, type Question, type Section } from "../assignments/assignment.model.js";
import { generationQueueName, type GenerationJobPayload } from "./generation.queue.js";
import { buildGenerationPrompt } from "./prompt-builder.js";
import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";

await connectMongo();

function generateOfflineResult(assignment: any, errorMsg?: string): { sections: Section[]; totalMarks: number } {
  const sections: Section[] = [];
  let questionCounter = 1;
  let accumulatedMarks = 0;

  for (const config of assignment.questionConfig) {
    const questions: Question[] = [];
    
    for (let i = 0; i < config.count; i++) {
      const qNum = questionCounter++;
      
      let text = `[Placeholder] Generate a ${config.type} question about ${assignment.subject}.`;
      if (errorMsg && qNum === 1) {
        text += ` (AI Error: ${errorMsg})`;
      }

      questions.push({
        questionNumber: qNum,
        text,
        type: config.type,
        difficulty: "medium",
        marks: config.marks,
        options: config.type.toLowerCase().includes("mcq") ? ["Option A", "Option B", "Option C", "Option D"] : [],
        answer: "This is a placeholder answer.",
        regenerateRound: assignment.regenerateCount || 0
      });
      accumulatedMarks += config.marks;
    }

    sections.push({
      title: `${config.type} Section`,
      instruction: `Answer all questions in this section. Each question is worth ${config.marks} Mark(s).`,
      questions
    });
  }

  return {
    sections,
    totalMarks: accumulatedMarks
  };
}

const redisPublisher = createRedisConnection();

const worker = new Worker<GenerationJobPayload>(
  generationQueueName,
  async (job) => {
    const assignment = await AssignmentModel.findById(job.data.assignmentId);

    if (!assignment) {
      throw new Error(`Assignment ${job.data.assignmentId} not found`);
    }

    assignment.status = "generating";
    await assignment.save();
    await job.updateProgress(20);

    const promptPayload = buildGenerationPrompt(assignment);

    let resultData = null;
    let geminiErrorMsg = "";

    if (env.GEMINI_API_KEY) {
      try {
        console.log(`Calling Gemini API using model ${env.GEMINI_MODEL}...`);
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        
        const promptText = `
        You are an expert CBSE/NCERT teacher preparing an assessment.
        Create a high-quality CBSE class question paper strictly matching the requested details.
        
        Assignment Title: ${promptPayload.assignment.title}
        Subject: ${promptPayload.assignment.subject}
        Grade Level: Class ${promptPayload.assignment.grade}
        Additional Guidelines: ${promptPayload.assignment.additionalInstructions || "None"}
        Reference Text / Chapters: ${promptPayload.assignment.sourceText || "None (use NCERT syllabus standard)"}
        
        The question paper must contain the following section configuration:
        ${promptPayload.assignment.questionConfig.map((c) => `- Section with ${c.count} x ${c.type} questions (each carrying ${c.marks} marks)`).join("\n")}
        
        Generate the paper strictly in the following JSON schema:
        {
          "sections": [
            {
              "title": "Section Title (e.g. Section A: Multiple Choice Questions)",
              "instruction": "Instructions for candidates...",
              "questions": [
                {
                  "questionNumber": 1,
                  "text": "The full text of the question...",
                  "type": "MCQ | Short Answer | Long Answer",
                  "difficulty": "easy | medium | hard",
                  "marks": 1,
                  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
                  "answer": "Ideal detailed answer key response"
                }
              ]
            }
          ],
          "totalMarks": 20
        }
        
        Ensure that:
        1. All questions have unique sequential questionNumbers starting from 1 across all sections.
        2. MCQ questions have exactly 4 values in 'options'. Other types must have an empty options array [].
        3. Output MUST be valid JSON only. Do not include markdown wrappers like \`\`\`json.
        `;

        const response = await ai.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: promptText,
          config: {
            responseMimeType: "application/json"
          }
        });

        const rawText = response.text || "";
        const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedText);

        if (parsed.sections && parsed.sections.length > 0) {
          // Re-map questions to include regenerateRound
          const mappedSections = parsed.sections.map((sec: any) => ({
            title: sec.title,
            instruction: sec.instruction,
            questions: (sec.questions || []).map((q: any) => ({
              questionNumber: Number(q.questionNumber),
              text: q.text,
              type: q.type,
              difficulty: q.difficulty || "medium",
              marks: Number(q.marks),
              options: q.options || [],
              answer: q.answer || q.answerKey,
              regenerateRound: assignment.regenerateCount || 0
            }))
          }));

          resultData = {
            sections: mappedSections,
            totalMarks: Number(parsed.totalMarks || assignment.questionConfig.reduce((sum, c) => sum + c.count * c.marks, 0))
          };
          console.log("Successfully generated paper using Gemini!");
        }
      } catch (err: any) {
        console.error("Gemini generation failed, falling back to simple placeholders:", err.message);
        geminiErrorMsg = err.message;
      }
    }

    if (!resultData) {
      console.log("Using simple placeholder generator...");
      resultData = generateOfflineResult(assignment, geminiErrorMsg);
    }

    await job.updateProgress(80);

    // If this is a regeneration, we MERGE the new questions with existing questions!
    if ((assignment.regenerateCount || 0) > 0 && assignment.result?.sections) {
      const existingSections = assignment.result.sections;
      const newSections = resultData.sections;

      // Zip the sections together
      const mergedSections = existingSections.map((oldSec, secIdx) => {
        const newSec = newSections[secIdx];
        if (!newSec) return oldSec;

        const mergedQuestions = oldSec.questions.map((oldQ: Question) => {
          // Check if there is a newly generated question for this slot
          const matchingNewQ = newSec.questions.find((nq: Question) => nq.questionNumber === oldQ.questionNumber);
          if (matchingNewQ) {
            // Keep the old question but append the new question under this regenerate round
            return matchingNewQ;
          }
          return oldQ;
        });

        // Add any brand new questions that didn't exist before
        newSec.questions.forEach((nq: Question) => {
          if (!mergedQuestions.some((mq: Question) => mq.questionNumber === nq.questionNumber)) {
            mergedQuestions.push(nq);
          }
        });

        return {
          title: oldSec.title,
          instruction: oldSec.instruction,
          questions: mergedQuestions
        };
      });

      assignment.result = {
        sections: mergedSections,
        totalMarks: assignment.result.totalMarks
      };
    } else {
      assignment.result = resultData;
    }

    await job.updateProgress(100);
    assignment.status = "completed";
    await assignment.save();
    console.log(`Assignment job ${job.id} completed successfully.`);
    redisPublisher.publish("vedaai_events", JSON.stringify({ type: "assignment_completed", assignmentId: assignment.id }));
  },
  { connection: createRedisConnection() },
);

worker.on("failed", async (job, error) => {
  if (!job) {
    return;
  }
  console.error(`Assignment job failed:`, error.message);
  await AssignmentModel.findByIdAndUpdate(job.data.assignmentId, {
    status: "failed",
    error: error.message,
  });
  redisPublisher.publish("vedaai_events", JSON.stringify({ type: "assignment_failed", assignmentId: job.data.assignmentId, error: error.message }));
});
