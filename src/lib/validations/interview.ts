import { z } from "zod";

const interviewStatusEnum = z.enum(["TO_SCHEDULE", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "IN_REVIEW", "APPROVED"]);

export const createInterviewSchema = z.object({
  title: z.string().max(255).optional(),
  contactName: z.string().max(255).optional(),
  contactPosition: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  contactCompany: z.string().max(255).optional(),
  scheduledDate: z.string().datetime().optional().nullable(),
  scheduledTime: z.string().max(10).optional().nullable(),
  duration: z.number().int().min(15).max(480).optional().default(60),
  questions: z.array(z.unknown()).optional(),
  selectedAssets: z.array(z.string()).optional(),
});

export const updateInterviewSchema = z.object({
  title: z.string().max(255).optional(),
  status: interviewStatusEnum.optional(),
  currentStep: z.number().int().min(1).max(5).optional(),
  contactName: z.string().max(255).optional(),
  contactPosition: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  contactCompany: z.string().max(255).optional(),
  scheduledDate: z.string().datetime().optional().nullable(),
  scheduledTime: z.string().max(10).optional().nullable(),
  duration: z.number().int().min(15).max(480).optional(),
  questions: z.array(z.unknown()).optional(),
  selectedAssets: z.array(z.string()).optional(),
  answers: z.record(z.string(), z.unknown()).optional().nullable(),
  generalNotes: z.string().max(10000).optional().nullable(),
  completionRate: z.number().min(0).max(100).optional(),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
