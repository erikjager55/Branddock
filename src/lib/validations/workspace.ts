import { z } from "zod";

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logo: z.string().url().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional().default("VIEWER"),
});

export const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
