import { z } from "zod";

const productSourceEnum = z.enum(["MANUAL", "WEBSITE_URL", "PDF_UPLOAD"]);
const productStatusEnum = z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]);

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional(),
  category: z.string().max(255).optional(),
  source: productSourceEnum.optional().default("MANUAL"),
  sourceUrl: z.string().url().optional().nullable(),
  pricingModel: z.string().max(255).optional(),
  pricingDetails: z.string().max(2000).optional(),
  features: z.array(z.string()).optional(),
  benefits: z.array(z.unknown()).optional(),
  useCases: z.array(z.unknown()).optional(),
  targetAudience: z.array(z.unknown()).optional(),
  workspaceId: z.string().uuid("Invalid workspace ID").optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().max(255).optional().nullable(),
  status: productStatusEnum.optional(),
  pricingModel: z.string().max(255).optional().nullable(),
  pricingDetails: z.string().max(2000).optional().nullable(),
  features: z.array(z.string()).optional().nullable(),
  benefits: z.array(z.unknown()).optional().nullable(),
  useCases: z.array(z.unknown()).optional().nullable(),
  targetAudience: z.array(z.unknown()).optional().nullable(),
});

export const analyzeUrlSchema = z.object({
  url: z.string().url("Invalid URL"),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const linkPersonaSchema = z.object({
  personaId: z.string().uuid("Invalid persona ID"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
