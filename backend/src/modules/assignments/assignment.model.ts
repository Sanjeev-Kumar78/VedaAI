import { Schema, model } from "mongoose";

export type AssignmentStatus = "draft" | "queued" | "generating" | "completed" | "failed";

export type QuestionTypeConfig = {
  type: string;
  count: number;
  marks: number;
};

export type Question = {
  questionNumber: number;
  text: string;
  type: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  options: string[];
  answer?: string;
  regenerateRound?: number;
};

export type Section = {
  title: string;
  instruction: string;
  questions: Question[];
};

export type AssignmentResult = {
  sections: Section[];
  totalMarks: number;
};

export type AssignmentDocument = {
  title: string;
  subject: string;
  grade: string;
  dueDate: Date;
  questionConfig: QuestionTypeConfig[];
  additionalInstructions?: string;
  sourceText?: string;
  status: AssignmentStatus;
  jobId?: string;
  resultId?: string;
  result?: AssignmentResult | null;
  regenerateCount?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

const questionTypeConfigSchema = new Schema<QuestionTypeConfig>(
  {
    type: { type: String, required: true },
    count: { type: Number, required: true, min: 1 },
    marks: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const questionSchema = new Schema<Question>(
  {
    questionNumber: { type: Number, required: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    marks: { type: Number, required: true },
    options: { type: [String], default: [] },
    answer: { type: String },
    regenerateRound: { type: Number, default: 0 },
  },
  { _id: false }
);

const sectionSchema = new Schema<Section>(
  {
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questions: { type: [questionSchema], default: [] },
  },
  { _id: false }
);

const resultSchema = new Schema<AssignmentResult>(
  {
    sections: { type: [sectionSchema], default: [] },
    totalMarks: { type: Number, required: true },
  },
  { _id: false }
);

const assignmentSchema = new Schema<AssignmentDocument>(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true },
    questionConfig: { type: [questionTypeConfigSchema], required: true },
    additionalInstructions: { type: String },
    sourceText: { type: String },
    status: {
      type: String,
      enum: ["draft", "queued", "generating", "completed", "failed"],
      default: "draft",
    },
    jobId: { type: String },
    resultId: { type: String },
    result: { type: resultSchema, default: null },
    regenerateCount: { type: Number, default: 0 },
    error: { type: String },
  },
  { timestamps: true },
);

export const AssignmentModel = model<AssignmentDocument>("Assignment", assignmentSchema);
