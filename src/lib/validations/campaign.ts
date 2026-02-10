import { z } from "zod";

const campaignStatusEnum = z.enum(["PLANNING", "DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional(),
  status: campaignStatusEnum.optional().default("PLANNING"),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  workspaceId: z.string().uuid("Invalid workspace ID").optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: campaignStatusEnum.optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
