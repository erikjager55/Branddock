import { z } from "zod";

export const createStrategySchema = z.object({
  type: z.string().min(1).max(100),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional(),
  status: z.string().optional().default("draft"),
  content: z.record(z.string(), z.unknown()).optional(),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const updateStrategySchema = z.object({
  type: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.string().optional(),
  content: z.record(z.string(), z.unknown()).optional().nullable(),
  isLocked: z.boolean().optional(),
});

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
