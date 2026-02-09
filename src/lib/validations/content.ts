import { z } from "zod";

const contentTypeEnum = z.enum([
  "BLOG_POST",
  "SOCIAL_MEDIA",
  "EMAIL",
  "AD_COPY",
  "LANDING_PAGE",
  "VIDEO",
  "CASE_STUDY",
  "REPORT",
  "WEBINAR",
]);

const contentStatusEnum = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "IN_REVIEW",
  "PUBLISHED",
  "PLANNED",
]);

export const createContentSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  body: z.string().max(100000).optional(),
  type: contentTypeEnum,
  status: contentStatusEnum.optional().default("DRAFT"),
  campaignId: z.string().uuid().optional().nullable(),
  onBrand: z.boolean().optional().default(true),
  brandScore: z.number().int().min(0).max(100).optional().nullable(),
  wordCount: z.number().int().min(0).optional().default(0),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().max(100000).optional().nullable(),
  type: contentTypeEnum.optional(),
  status: contentStatusEnum.optional(),
  campaignId: z.string().uuid().optional().nullable(),
  onBrand: z.boolean().optional(),
  brandScore: z.number().int().min(0).max(100).optional().nullable(),
  wordCount: z.number().int().min(0).optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
