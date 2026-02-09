import { z } from "zod";

const researchTypeEnum = z.enum(["SURVEY", "INTERVIEW", "ANALYSIS", "AI_EXPLORATION"]);
const researchStatusEnum = z.enum(["DRAFT", "ACTIVE", "COMPLETED"]);

export const createResearchSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: researchTypeEnum,
  status: researchStatusEnum.optional().default("DRAFT"),
  description: z.string().max(5000).optional(),
  findings: z.record(z.string(), z.unknown()).optional(),
  participantCount: z.number().int().min(0).optional().default(0),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const updateResearchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: researchTypeEnum.optional(),
  status: researchStatusEnum.optional(),
  description: z.string().max(5000).optional().nullable(),
  findings: z.record(z.string(), z.unknown()).optional().nullable(),
  participantCount: z.number().int().min(0).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export type CreateResearchInput = z.infer<typeof createResearchSchema>;
export type UpdateResearchInput = z.infer<typeof updateResearchSchema>;
