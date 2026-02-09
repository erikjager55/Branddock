import { z } from "zod";

export const createPersonaSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  role: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  avatar: z.string().url().optional().nullable(),
  demographics: z.record(z.string(), z.unknown()).optional(),
  goals: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional().default([]),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const updatePersonaSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().max(255).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  demographics: z.record(z.string(), z.unknown()).optional().nullable(),
  goals: z.array(z.string()).optional().nullable(),
  painPoints: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
