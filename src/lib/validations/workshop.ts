import { z } from "zod";

const workshopStatusEnum = z.enum(["DRAFT", "PURCHASED", "IN_PROGRESS", "COMPLETED"]);

export const createWorkshopSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.string().optional().default("golden-circle"),
  bundle: z.string().optional().nullable(),
  hasFacilitator: z.boolean().optional().default(false),
  purchaseAmount: z.number().optional().nullable(),
  totalSteps: z.number().int().optional().default(6),
  objectives: z.array(z.unknown()).optional().nullable(),
  agenda: z.array(z.unknown()).optional().nullable(),
});

export const updateWorkshopSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: workshopStatusEnum.optional(),
  currentStep: z.number().int().min(0).optional(),
  stepResponses: z.record(z.string(), z.unknown()).optional().nullable(),
  canvas: z.record(z.string(), z.unknown()).optional().nullable(),
  notes: z.array(z.unknown()).optional().nullable(),
  gallery: z.array(z.unknown()).optional().nullable(),
  participantCount: z.number().int().min(0).optional(),
  participants: z.array(z.unknown()).optional().nullable(),
  facilitator: z.string().optional().nullable(),
});

export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>;
export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;
