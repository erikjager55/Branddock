import { z } from "zod";

export const createStyleguideSchema = z.object({
  sourceUrl: z.string().url().optional().nullable(),
  sourceType: z.string().max(100).optional().nullable(),
  logo: z.record(z.string(), z.unknown()).optional(),
  colors: z.record(z.string(), z.unknown()).optional(),
  typography: z.record(z.string(), z.unknown()).optional(),
  toneOfVoice: z.record(z.string(), z.unknown()).optional(),
  imagery: z.record(z.string(), z.unknown()).optional(),
});

export const updateStyleguideSchema = z.object({
  sourceUrl: z.string().url().optional().nullable(),
  sourceType: z.string().max(100).optional().nullable(),
  logo: z.record(z.string(), z.unknown()).optional().nullable(),
  colors: z.record(z.string(), z.unknown()).optional().nullable(),
  typography: z.record(z.string(), z.unknown()).optional().nullable(),
  toneOfVoice: z.record(z.string(), z.unknown()).optional().nullable(),
  imagery: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type CreateStyleguideInput = z.infer<typeof createStyleguideSchema>;
export type UpdateStyleguideInput = z.infer<typeof updateStyleguideSchema>;
