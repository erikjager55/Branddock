import { z } from "zod";

const questionnaireStatusEnum = z.enum(["DRAFT", "COLLECTING", "ANALYZED", "VALIDATED"]);

export const createQuestionnaireSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["text", "rating", "multiple_choice", "single_choice", "scale"]),
    required: z.boolean().optional().default(true),
    options: z.array(z.string()).optional(),
  })).optional(),
  distributionMethod: z.enum(["email", "link", "both"]).optional().default("email"),
  emailSubject: z.string().max(500).optional(),
  emailBody: z.string().max(5000).optional(),
  isAnonymous: z.boolean().optional().default(false),
  allowMultiple: z.boolean().optional().default(false),
  reminderDays: z.number().int().min(1).max(30).optional().nullable(),
});

export const updateQuestionnaireSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: questionnaireStatusEnum.optional(),
  currentStep: z.number().int().min(1).max(5).optional(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["text", "rating", "multiple_choice", "single_choice", "scale"]),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
  })).optional(),
  distributionMethod: z.enum(["email", "link", "both"]).optional(),
  emailSubject: z.string().max(500).optional().nullable(),
  emailBody: z.string().max(5000).optional().nullable(),
  isAnonymous: z.boolean().optional(),
  allowMultiple: z.boolean().optional(),
  reminderDays: z.number().int().min(1).max(30).optional().nullable(),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })).optional(),
});

export const submitResponseSchema = z.object({
  respondentId: z.string().optional(),
  answers: z.record(z.string(), z.unknown()),
  completionTime: z.number().int().optional(),
});

export type CreateQuestionnaireInput = z.infer<typeof createQuestionnaireSchema>;
export type UpdateQuestionnaireInput = z.infer<typeof updateQuestionnaireSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
