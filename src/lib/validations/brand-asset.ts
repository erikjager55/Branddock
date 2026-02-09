import { z } from "zod";

const assetTypeEnum = z.enum([
  "MISSION",
  "VISION",
  "VALUES",
  "POSITIONING",
  "PROMISE",
  "STORY",
  "OTHER",
]);

const assetCategoryEnum = z.enum([
  "FOUNDATION",
  "STRATEGY",
  "EXPRESSION",
  "IDENTITY",
]);

const assetStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "IN_PROGRESS",
  "AI_ANALYSIS_COMPLETE",
  "VALIDATED",
  "LOCKED",
]);

export const createBrandAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional(),
  type: assetTypeEnum,
  category: assetCategoryEnum.optional().default("FOUNDATION"),
  status: assetStatusEnum.optional().default("DRAFT"),
  content: z.record(z.string(), z.unknown()).optional(),
  fileUrl: z.string().url().optional().nullable(),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const updateBrandAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  type: assetTypeEnum.optional(),
  category: assetCategoryEnum.optional(),
  status: assetStatusEnum.optional(),
  content: z.record(z.string(), z.unknown()).optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
  validationScore: z.number().min(0).max(100).optional(),
  lockedById: z.string().uuid().optional().nullable(),
});

export type CreateBrandAssetInput = z.infer<typeof createBrandAssetSchema>;
export type UpdateBrandAssetInput = z.infer<typeof updateBrandAssetSchema>;
