import cors from "cors";
import express from "express";
import { assignmentRouter } from "./modules/assignments/assignment.routes.js";
import { AssignmentModel } from "./modules/assignments/assignment.model.js";
import { env } from "./config/env.js";
import PDFDocument from "pdfkit";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { generationQueue } from "./modules/generation/generation.queue.js";
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "vedaai-backend" });
  });

  app.use("/api/assignments", assignmentRouter);

  // Bull Board Setup
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({
    queues: [new BullMQAdapter(generationQueue)],
    serverAdapter: serverAdapter,
  });
  app.use("/admin/queues", serverAdapter.getRouter());

  // PDF Generation Endpoint
  app.post("/api/results/:assignmentId/pdf", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { assignmentId } = req.params;
      const { withAnswerKey, keptQuestionNumbers } = req.body;

      const assignment = await AssignmentModel.findById(assignmentId);
      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      if (!assignment.result) {
        res.status(400).json({ error: "Assignment has no generated result yet." });
        return;
      }

      const doc = new PDFDocument({ margin: 54, size: "A4" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=assessment_${assignmentId}.pdf`
      );

      doc.pipe(res);

      // School Header
      doc.font("Helvetica-Bold").fontSize(14).text("Delhi Public School, Sector-4, Bokaro", { align: "center" });
      doc.moveDown(0.5);
      
      // Subject & Class
      doc.font("Helvetica").fontSize(10).text(`Subject: ${assignment.subject}`, { align: "center" });
      doc.text(`Class: ${assignment.grade}`, { align: "center" });
      doc.moveDown(2);

      let totalKeptQuestions = 0;
      let displayIndex = 1;

      // Filter and compute active sections to accurately calculate dynamic total marks
      const activeSections = assignment.result.sections.map((section: any) => {
        const filteredQs = section.questions.filter((q: any) => {
          if (keptQuestionNumbers && Array.isArray(keptQuestionNumbers)) {
            return keptQuestionNumbers.includes(q.questionNumber);
          }
          return true;
        });

        return {
          ...section,
          questions: filteredQs,
        };
      }).filter((s: any) => s.questions.length > 0);

      // Compute actual printed total marks
      const dynamicTotalMarks = activeSections.reduce((sum: number, section: any) => {
        return sum + section.questions.reduce((qSum: number, q: any) => qSum + q.marks, 0);
      }, 0);

      // Metadata Block
      const totalMarks = dynamicTotalMarks > 0 ? dynamicTotalMarks : (assignment.result?.totalMarks || assignment.questionConfig.reduce((sum: number, c: any) => sum + c.count * c.marks, 0));
      const duration = totalMarks <= 20 ? "45 Minutes" : totalMarks <= 50 ? "1.5 Hours" : "3 Hours";
      
      const startY = doc.y;
      doc.font("Helvetica").fontSize(10);
      doc.text(`Time Allowed: ${duration}`, 54, startY);
      doc.text(`Maximum Marks: ${totalMarks}`, 350, startY, { align: "right", width: 191 });
      doc.moveDown(2);

      // General Instructions
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("All questions are compulsory unless stated otherwise.", 54, doc.y);
      doc.moveDown(2);

      // Student Details Fields
      doc.font("Helvetica").fontSize(10);
      doc.text("Name: _________________________", 54, doc.y);
      doc.moveDown(0.5);
      doc.text("Roll Number: ___________________", 54, doc.y);
      doc.moveDown(0.5);
      doc.text(`Class: ${assignment.grade} Section: ___________`, 54, doc.y);
      doc.moveDown(2);

      activeSections.forEach((section: any, sIdx: number) => {
        // Reset doc.x to avoid centering bugs caused by previous option column drawing
        doc.x = 54;
        
        // Section Header (Centered)
        doc.font("Helvetica-Bold").fontSize(12).text(`Section ${String.fromCharCode(65 + sIdx)}`, { align: "center" });
        doc.moveDown(1);
        
        // Section Title & Instruction
        if (section.title) {
          doc.font("Helvetica-Bold").fontSize(10).text(section.title, { align: "center" });
        }
        if (section.instruction) {
          doc.font("Helvetica").fontSize(9).text(section.instruction, { align: "center" });
        }
        doc.moveDown(1);

        section.questions.forEach((q: any) => {
          doc.x = 54;
          totalKeptQuestions++;
          const qNum = displayIndex++;
          
          doc.font("Helvetica").fontSize(10);
          
          // Question text layout
          const diffLabel = q.difficulty ? ` [${q.difficulty.toUpperCase()}]` : "";
          const qPrefix = `${qNum}.${diffLabel} `;
          const qSuffix = ` [${q.marks} Mark${q.marks > 1 ? "s" : ""}]`;

          // Keep question prefix bold
          doc.font("Helvetica-Bold").text(qPrefix, { continued: true });
          doc.font("Helvetica").text(q.text, { continued: true });
          doc.font("Helvetica-Bold").text(qSuffix);

          // Options (MCQs)
          if (q.options && q.options.length > 0) {
            doc.moveDown(0.3);
            doc.font("Helvetica").fontSize(9.5);
            
            // Format options in 2 columns
            const startX = 70;
            const width = 230;
            const currentY = doc.y;
            
            const labels = ["A", "B", "C", "D"];
            q.options.forEach((opt: string, optIdx: number) => {
              const cleanedOpt = opt.replace(/^[A-D]\.\s*/i, "");
              const col = optIdx % 2;
              const row = Math.floor(optIdx / 2);
              
              const xPos = startX + col * width;
              const yPos = currentY + row * 16;
              
              doc.text(`(${labels[optIdx]}) ${cleanedOpt}`, xPos, yPos);
            });
            doc.y = currentY + 36; // Advance cursor
          }

          doc.moveDown(1.2);
        });

        if (sIdx < activeSections.length - 1) {
          doc.moveDown(1);
        }
      });

      // Answer Key Page
      if (withAnswerKey && totalKeptQuestions > 0) {
        doc.addPage();
        
        doc.font("Helvetica-Bold").fontSize(16).text("ANSWER KEY & MODEL RESPONSES", { align: "center" });
        doc.moveDown(1);
        doc.moveTo(54, doc.y).lineTo(541, doc.y).strokeColor("#f06e30").lineWidth(1.5).stroke();
        doc.moveDown(1.5);

        let ansIndex = 1;
        activeSections.forEach((section) => {
          section.questions.forEach((q: any) => {
            const num = ansIndex++;
            doc.font("Helvetica-Bold").fontSize(10).text(`Question ${num}: [${q.type}]`, { continued: true });
            doc.font("Helvetica").text(` - ${q.text}`);
            doc.moveDown(0.3);

            doc.font("Helvetica-Oblique").fontSize(9.5).fillColor("#333333");
            const answerText = q.answer || "Ideal response defining the key concepts with curriculum-aligned formulas.";
            doc.text(`Model Answer: ${answerText}`);
            doc.fillColor("#1c1c1c"); // reset color
            doc.moveDown(1.5);
          });
        });
      }

      doc.end();
    } catch (error) {
      next(error);
    }
  });

  return app;
}
