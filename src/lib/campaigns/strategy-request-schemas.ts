import { z } from "zod";

/**
 * L8 Zod-sweep (audit 2026-06-26) — gedeelde request-schema's voor de
 * wizard-strategy-routes (validate-briefing / improve-briefing /
 * build-foundation / elaborate).
 *
 * Zelfde shapes als de inline schema's die build-strategy /
 * generate-concepts / quick-concept al hebben: strak op ids en enums,
 * permissief (`passthrough`) waar de engine bewust vrije JSON verwacht
 * (briefing, gesynthetiseerde lagen) — het doel is shape-afbakening,
 * niet het herontwerpen van het engine-contract.
 */

const idArray = z.array(z.string().min(1).max(100)).max(100);

export const wizardContextSchema = z
  .object({
    campaignName: z.string().min(1).max(500),
    campaignDescription: z.string().max(10000).optional(),
    campaignGoalType: z.string().max(200).optional(),
    briefing: z.object({}).passthrough().optional(),
    useExternalEnrichment: z.boolean().optional(),
  })
  .passthrough();

export const pipelineConfigSchema = z.object({
  strategyDepth: z.enum(["basic", "grounded", "research-backed"]),
  creativeRange: z.enum(["single", "multi-variant", "critiqued"]),
  modelRigor: z.enum(["fast", "balanced", "deliberate"]),
});

export const wizardPipelineBaseSchema = z.object({
  campaignId: z.string().max(100).optional(),
  personaIds: idArray.optional(),
  productIds: idArray.optional(),
  competitorIds: idArray.optional(),
  trendIds: idArray.optional(),
  strategicIntent: z.string().max(50).optional(),
  wizardContext: wizardContextSchema,
  pipelineConfig: pipelineConfigSchema.optional(),
});

export const validateBriefingBodySchema = wizardPipelineBaseSchema;
export const buildFoundationBodySchema = wizardPipelineBaseSchema;

export const improveBriefingBodySchema = z.object({
  campaignId: z.string().max(100).optional(),
  strategicIntent: z.string().max(50).optional(),
  wizardContext: wizardContextSchema,
  validation: z.object({}).passthrough(),
});

export const elaborateJourneyBodySchema = wizardPipelineBaseSchema.extend({
  synthesisFeedback: z.string().max(20000).optional(),
  synthesizedStrategy: z.object({}).passthrough().optional(),
  synthesizedArchitecture: z.object({}).passthrough().optional(),
  personaValidation: z.array(z.unknown()).max(100).optional(),
});
