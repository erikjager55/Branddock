import { z } from "zod";

const analysisTypeEnum = z.enum(["BRAND_ANALYSIS", "PERSONA_ANALYSIS"]);
const analysisStatusEnum = z.enum(["IN_PROGRESS", "COMPLETED", "ARCHIVED"]);

export const startAnalysisSchema = z.object({
  type: analysisTypeEnum,
});

export const updateAnalysisSchema = z.object({
  status: analysisStatusEnum.optional(),
  progress: z.number().min(0).max(100).optional(),
  dataPoints: z.number().int().min(0).optional(),
  duration: z.number().int().optional().nullable(),
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
        timestamp: z.string(),
      })
    )
    .optional(),
  executiveSummary: z.string().optional().nullable(),
  keyFindings: z.array(z.unknown()).optional().nullable(),
  recommendations: z.array(z.unknown()).optional().nullable(),
  dimensions: z.array(z.unknown()).optional().nullable(),
  confidenceBoost: z.number().optional().nullable(),
});

export type StartAnalysisInput = z.infer<typeof startAnalysisSchema>;
export type UpdateAnalysisInput = z.infer<typeof updateAnalysisSchema>;
