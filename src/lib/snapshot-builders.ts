import type { Persona, BrandAsset, BusinessStrategy, Product, BrandStyleguide } from '@prisma/client';

export function buildPersonaSnapshot(persona: Persona): Record<string, unknown> {
  return {
    name: persona.name,
    tagline: persona.tagline,
    avatarUrl: persona.avatarUrl,
    age: persona.age,
    gender: persona.gender,
    location: persona.location,
    occupation: persona.occupation,
    education: persona.education,
    income: persona.income,
    familyStatus: persona.familyStatus,
    personalityType: persona.personalityType,
    coreValues: persona.coreValues,
    interests: persona.interests,
    goals: persona.goals,
    motivations: persona.motivations,
    frustrations: persona.frustrations,
    behaviors: persona.behaviors,
    preferredChannels: persona.preferredChannels,
    techStack: persona.techStack,
    buyingTriggers: persona.buyingTriggers,
    decisionCriteria: persona.decisionCriteria,
    strategicImplications: persona.strategicImplications,
    quote: persona.quote,
    bio: persona.bio,
  };
}

export function buildBrandAssetSnapshot(asset: BrandAsset): Record<string, unknown> {
  return {
    name: asset.name,
    description: asset.description,
    category: asset.category,
    status: asset.status,
    content: asset.content,
    frameworkType: asset.frameworkType,
    frameworkData: asset.frameworkData,
  };
}

export function buildStrategySnapshot(strategy: BusinessStrategy): Record<string, unknown> {
  return {
    name: strategy.name,
    description: strategy.description,
    type: strategy.type,
    status: strategy.status,
    vision: strategy.vision,
    rationale: strategy.rationale,
    keyAssumptions: strategy.keyAssumptions,
    startDate: strategy.startDate?.toISOString() ?? null,
    endDate: strategy.endDate?.toISOString() ?? null,
  };
}

export function buildProductSnapshot(product: Product): Record<string, unknown> {
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    status: product.status,
  };
}

export function buildStyleguideSnapshot(sg: BrandStyleguide): Record<string, unknown> {
  return {
    status: sg.status,
    sourceType: sg.sourceType,
    logoVariations: sg.logoVariations,
    logoGuidelines: sg.logoGuidelines,
    logoDonts: sg.logoDonts,
    colorDonts: sg.colorDonts,
    primaryFontName: sg.primaryFontName,
    primaryFontUrl: sg.primaryFontUrl,
    typeScale: sg.typeScale,
    contentGuidelines: sg.contentGuidelines,
    writingGuidelines: sg.writingGuidelines,
    examplePhrases: sg.examplePhrases,
    photographyStyle: sg.photographyStyle,
    photographyGuidelines: sg.photographyGuidelines,
    illustrationGuidelines: sg.illustrationGuidelines,
    imageryDonts: sg.imageryDonts,
  };
}
