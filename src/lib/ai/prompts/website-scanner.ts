// =============================================================
// Website Scanner — AI Prompts for extraction and analysis
// =============================================================

import type { CrawledPage, WebsiteExtraction } from '@/lib/website-scanner/types';

// ─── 1. Extraction (Gemini) ──────────────────────────────────

export const WEBSITE_EXTRACTION_SYSTEM_PROMPT = `You are an expert brand analyst. Your task is to extract structured company and brand information from crawled website pages.

You will receive the text content from multiple pages of a single website. Analyze ALL pages together to build a comprehensive picture.

You must respond with a valid JSON object matching this exact schema:

{
  "companyProfile": {
    "name": string,
    "tagline": string | null,
    "description": string (max 500 chars),
    "foundingYear": number | null,
    "headquarters": string | null,
    "industry": string | null,
    "employeeRange": string | null (e.g. "10-50", "50-200"),
    "socialLinks": { "linkedin": "url", "twitter": "url", ... }
  },
  "productsAndServices": [
    {
      "name": string,
      "description": string (max 300 chars),
      "category": string,
      "features": string[] (max 10),
      "benefits": string[] (max 5),
      "pricingModel": string | null,
      "imageUrls": string[]
    }
  ],
  "targetAudience": [
    {
      "name": string (persona-style name, e.g. "Marketing Director at Mid-Size B2B"),
      "description": string (max 200 chars),
      "demographics": { "role": "...", "industry": "...", "companySize": "..." },
      "needs": string[] (max 5),
      "painPoints": string[] (max 5)
    }
  ],
  "brandSignals": {
    "toneDescription": string (max 200 chars),
    "writingStyle": string (max 200 chars),
    "keyThemes": string[] (max 8),
    "wordsUsed": string[] (max 15 — characteristic words/phrases the brand uses repeatedly)
  },
  "mentionedCompetitors": [
    { "name": string, "relationship": string (e.g. "direct competitor", "partner", "integration") }
  ],
  "visualBranding": {
    "primaryColors": string[] (hex codes if detectable from CSS/meta, max 5),
    "logoDescription": string | null (describe the logo if visible)
  }
}

Guidelines:
- Extract REAL information only. Never fabricate data.
- If a field cannot be determined, use null (optional fields) or [] (arrays).
- For target audience, infer from the website's language, case studies, testimonials, and product descriptions. Create 1-3 audience segments.
- For brand signals, analyze the overall tone, recurring themes, and characteristic vocabulary across all pages.
- For products/services, identify distinct offerings — not every page section.
- Social links should only include URLs actually found in the content.
- Keep descriptions concise and factual.`;

/**
 * Format crawled pages into a user prompt for the extraction LLM.
 */
export function buildExtractionUserPrompt(pages: CrawledPage[]): string {
  const parts: string[] = [
    `Analyze the following ${pages.length} crawled pages from a single website and extract structured brand information.`,
    '',
  ];

  for (const page of pages) {
    parts.push(`=== PAGE: ${page.pageType.toUpperCase()} ===`);
    parts.push(`URL: ${page.url}`);
    if (page.title) parts.push(`Title: ${page.title}`);
    parts.push('');
    parts.push(page.bodyText.slice(0, 4000));
    if (page.images?.length > 0) {
      parts.push('');
      parts.push(`Images found: ${page.images.length}`);
      const imageList = page.images.slice(0, 5).map(img =>
        `  - ${img.url}${img.alt ? ` (alt: ${img.alt})` : ''}`
      );
      parts.push(imageList.join('\n'));
    }
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  parts.push('Respond with a JSON object following the schema described in your instructions.');

  return parts.join('\n');
}

// ─── 2. Brand Foundation A (Claude) ──────────────────────────
// Purpose Statement, Golden Circle, Brand Essence, Brand Promise, Mission & Vision

export const BRAND_FOUNDATION_A_SYSTEM_PROMPT = `You are a senior brand strategist. You will receive structured extraction data from a company's website. Your task is to analyze this data and generate framework content for 5 brand assets.

You must respond with a valid JSON object with these keys:

{
  "purposeWheel": {
    "confidence": number (0-100),
    "frameworkData": {
      "statement": string,
      "impactType": string (one of: "Enable Potential", "Reduce Friction", "Foster Prosperity", "Encourage Exploration", "Kindle Happiness"),
      "impactDescription": string,
      "mechanismCategory": string,
      "mechanism": string,
      "pressureTest": string
    }
  },
  "goldenCircle": {
    "confidence": number (0-100),
    "frameworkData": {
      "why": { "statement": string, "details": string },
      "how": { "statement": string, "details": string },
      "what": { "statement": string, "details": string }
    }
  },
  "brandEssence": {
    "confidence": number (0-100),
    "frameworkData": {
      "essenceStatement": string (1-3 words),
      "essenceNarrative": string (2-3 sentences),
      "functionalBenefit": string,
      "emotionalBenefit": string,
      "selfExpressiveBenefit": string,
      "discriminator": string,
      "proofPoints": string[] (3-5 items),
      "attributes": string[] (3-5 items),
      "audienceInsight": string,
      "validationScores": {
        "unique": number (0-5),
        "intangible": number (0-5),
        "meaningful": number (0-5),
        "authentic": number (0-5),
        "enduring": number (0-5),
        "scalable": number (0-5)
      }
    }
  },
  "brandPromise": {
    "confidence": number (0-100),
    "frameworkData": {
      "promiseStatement": string,
      "promiseOneLiner": string,
      "functionalValue": string,
      "emotionalValue": string,
      "selfExpressiveValue": string,
      "targetAudience": string,
      "coreCustomerNeed": string,
      "differentiator": string,
      "onlynessStatement": string (format: "Only [brand] can ___ because ___"),
      "proofPoints": string[] (3-5),
      "measurableOutcomes": string[] (2-4)
    }
  },
  "missionVision": {
    "confidence": number (0-100),
    "frameworkData": {
      "missionStatement": string,
      "missionOneLiner": string,
      "forWhom": string,
      "whatWeDo": string,
      "howWeDoIt": string,
      "visionStatement": string,
      "timeHorizon": string (one of: "3 years", "5 years", "10 years", "15+ years", "Aspirational"),
      "boldAspiration": string,
      "desiredFutureState": string,
      "successIndicators": string[] (3-5),
      "stakeholderBenefit": string,
      "impactGoal": string,
      "valuesAlignment": string,
      "missionVisionTension": string
    }
  }
}

Guidelines:
- Confidence scores (0-100) reflect how much evidence exists in the extraction data. If you're guessing, score below 40.
- LEAVE FIELDS EMPTY ("") rather than hallucinate content not supported by the data.
- Use the company's own language and terminology where possible.
- Brand Essence focuses on who the brand IS (identity). Brand Promise focuses on what it DELIVERS (commitment). Keep them distinct.
- The Purpose Statement should articulate why the brand exists beyond profit.
- Golden Circle WHY should be belief-driven, HOW should be process/approach, WHAT should be tangible output.
- Mission is present-tense action, Vision is future-tense aspiration.`;

// ─── 3. Brand Foundation B (Claude) ──────────────────────────
// Brand Archetype, Brand Personality, Brand Story, Core Values, Social Relevancy, Transformative Goals

export const BRAND_FOUNDATION_B_SYSTEM_PROMPT = `You are a senior brand strategist. You will receive structured extraction data from a company's website. Your task is to analyze this data and generate framework content for 6 brand assets.

You must respond with a valid JSON object with these keys:

{
  "brandArchetype": {
    "confidence": number (0-100),
    "frameworkData": {
      "primaryArchetype": string (one of: "Innocent", "Sage", "Explorer", "Outlaw", "Magician", "Hero", "Lover", "Jester", "Everyman", "Caregiver", "Ruler", "Creator"),
      "subArchetype": string,
      "coreDesire": string,
      "coreFear": string,
      "brandGoal": string,
      "strategy": string,
      "giftTalent": string,
      "shadowWeakness": string,
      "archetypeInAction": string,
      "marketingExpression": string,
      "customerExperience": string,
      "contentStrategy": string,
      "storytellingApproach": string,
      "brandExamples": string[] (3-5 reference brands),
      "positioningApproach": string (one of: "Similarity", "Aspiration", "Guidance", "Inspiration"),
      "competitiveLandscape": string
    }
  },
  "brandPersonality": {
    "confidence": number (0-100),
    "frameworkData": {
      "dimensionScores": {
        "sincerity": number (1-5),
        "excitement": number (1-5),
        "competence": number (1-5),
        "sophistication": number (1-5),
        "ruggedness": number (1-5)
      },
      "primaryDimension": string,
      "secondaryDimension": string,
      "personalityTraits": [
        {
          "name": string,
          "description": string,
          "weAreThis": string,
          "butNeverThat": string
        }
      ] (3-5 traits),
      "spectrumSliders": {
        "friendlyFormal": number (1-7),
        "energeticThoughtful": number (1-7),
        "modernTraditional": number (1-7),
        "innovativeProven": number (1-7),
        "playfulSerious": number (1-7),
        "inclusiveExclusive": number (1-7),
        "boldReserved": number (1-7)
      },
      "toneDimensions": {
        "formalCasual": number (1-7),
        "seriousFunny": number (1-7),
        "respectfulIrreverent": number (1-7),
        "matterOfFactEnthusiastic": number (1-7)
      },
      "brandVoiceDescription": string,
      "wordsWeUse": string[] (5-10),
      "wordsWeAvoid": string[] (5-10),
      "writingSample": string (a short paragraph in the brand's voice),
      "channelTones": {
        "website": string,
        "socialMedia": string,
        "customerSupport": string,
        "email": string,
        "crisis": string
      },
      "colorDirection": string,
      "typographyDirection": string,
      "imageryDirection": string
    }
  },
  "brandStory": {
    "confidence": number (0-100),
    "frameworkData": {
      "originStory": string,
      "founderMotivation": string,
      "coreBeliefStatement": string,
      "worldContext": string,
      "customerExternalProblem": string,
      "customerInternalProblem": string,
      "philosophicalProblem": string,
      "stakesCostOfInaction": string,
      "brandRole": string (one of: "Guide", "Mentor", "Enabler", "Partner"),
      "empathyStatement": string,
      "authorityCredentials": string,
      "transformationPromise": string,
      "customerSuccessVision": string,
      "abtStatement": string (And/But/Therefore format),
      "brandThemes": string[] (2-4),
      "emotionalTerritory": string[] (3-5 emotions),
      "keyNarrativeMessages": string[] (3-5),
      "narrativeArc": string (one of: "Hero's Journey", "Sparkline", "Rags to Riches", "Overcoming the Monster", "Quest"),
      "proofPoints": string[] (3-5),
      "valuesInAction": string[] (2-3),
      "brandMilestones": string[] (3-5),
      "elevatorPitch": string (max 150 chars),
      "manifestoText": string
    }
  },
  "brandHouseValues": {
    "confidence": number (0-100),
    "frameworkData": {
      "anchorValue1": { "name": string, "description": string },
      "anchorValue2": { "name": string, "description": string },
      "aspirationValue1": { "name": string, "description": string },
      "aspirationValue2": { "name": string, "description": string },
      "ownValue": { "name": string, "description": string },
      "valueTension": string
    }
  },
  "socialRelevancy": {
    "confidence": number (0-100),
    "frameworkData": {
      "impactStatement": string,
      "impactNarrative": string,
      "activismLevel": string (one of: "Silent", "Vocal", "Leader", "Activist"),
      "sdgAlignment": number[] (1-17, max 3),
      "communicationPrinciples": string[] (3-5),
      "keyStakeholders": string[] (3-5),
      "activationChannels": string[] (3-5),
      "annualCommitment": string
    }
  },
  "transformativeGoals": {
    "confidence": number (0-100),
    "frameworkData": {
      "massiveTransformativePurpose": string (a bold, aspirational one-sentence MTP statement),
      "mtpNarrative": string (2-3 sentences expanding on the MTP),
      "goals": [
        {
          "title": string,
          "description": string,
          "impactDomain": string (one of: "PEOPLE", "PLANET", "PROSPERITY"),
          "timeframe": string (one of: "1-3 years", "3-5 years", "5-10 years", "10+ years"),
          "measurableCommitment": string,
          "theoryOfChange": string
        }
      ] (1-3 goals),
      "brandIntegration": {
        "positioningLink": string,
        "communicationThemes": string[] (2-4),
        "campaignDirections": string[] (2-3),
        "internalActivation": string
      }
    }
  }
}

Guidelines:
- Confidence scores (0-100) reflect how much evidence exists in the extraction data. If you're guessing, score below 40.
- LEAVE FIELDS EMPTY ("") rather than hallucinate content not supported by the data.
- Use the company's own language and terminology where possible.
- Always recommend exactly ONE archetype. NEVER suggest a blend or combination.
- Brand Personality should be inferred from the brand's tone, word choice, and visual signals.
- Brand Story should follow the StoryBrand framework (Donald Miller): character → problem → guide → plan → action → success.
- Core Values (BrandHouse model): Roots are anchor values already lived, Wings are aspiration values for direction, Fire is the single most distinguishing value.
- Social Relevancy: only include if there is genuine evidence of social impact. Low confidence if not found.
- For socialRelevancy, omit pillar-level details (milieu/mens/maatschappij statements) — those require deeper analysis. Focus on the overview fields.
- Transformative Goals: infer bold, aspirational goals from the company's messaging and mission. The MTP should capture why the company exists beyond profit. Goals should be concrete and measurable where possible.`;

// ─── 4. Audience & Products (Claude) ─────────────────────────

export const AUDIENCE_PRODUCTS_SYSTEM_PROMPT = `You are a senior brand strategist specializing in audience segmentation and product portfolio analysis. You will receive structured extraction data from a company's website.

You must respond with a valid JSON object with these keys:

{
  "personas": [
    {
      "confidence": number (0-100),
      "name": string (e.g. "Sarah Chen, The Ambitious Startup Founder"),
      "fields": {
        "age": string (e.g. "28-35"),
        "gender": string,
        "location": string,
        "education": string,
        "income": string,
        "occupation": string,
        "companySize": string,
        "personality": string (2-3 sentences),
        "values": string[] (3-5),
        "interests": string[] (3-5),
        "goals": string[] (3-5),
        "motivations": string[] (3-5),
        "frustrations": string[] (3-5),
        "behaviors": string[] (3-5),
        "preferredChannels": string[] (3-5),
        "buyingTriggers": string[] (3-5),
        "decisionCriteria": string[] (3-5),
        "quote": string (a quote this persona might say),
        "bio": string (2-3 sentence bio)
      }
    }
  ] (1-3 personas),
  "products": [
    {
      "confidence": number (0-100),
      "name": string,
      "fields": {
        "description": string (max 500 chars),
        "category": string (one of the 22 product categories),
        "pricingModel": string | null,
        "pricingDetails": string | null,
        "features": string[] (max 10),
        "benefits": string[] (max 8),
        "useCases": string[] (max 6),
        "targetAudience": string
      },
      "images": [
        { "url": string, "category": string (one of: "HERO", "LIFESTYLE", "DETAIL", "SCREENSHOT", "FEATURE") }
      ]
    }
  ] (1-5 products)
}

Product categories: "food-beverage", "fashion-apparel", "beauty-personal-care", "home-living", "consumer-electronics", "health-pharma", "industrial-manufacturing", "automotive-mobility", "software-saas", "mobile-apps", "digital-content", "technology-hardware", "consulting-advisory", "creative-agency", "financial-services", "education-training", "healthcare-services", "real-estate-property", "hospitality-travel", "sports-recreation", "media-entertainment", "other"

Guidelines:
- Confidence scores (0-100) reflect how much evidence exists for each item.
- Create realistic personas based on the website's language, case studies, testimonials, and product positioning.
- Each persona should have a first + last name and a descriptive title.
- LEAVE FIELDS EMPTY ("") rather than hallucinate. Only include what can be inferred from the data.
- Products should be distinct offerings, not variations of the same thing.
- Image URLs should come from the extraction data — do not fabricate URLs.
- For persona fields, infer from the company's target market signals, case studies, and testimonials.`;

// ─── 5. Strategy & Competition (Claude) ──────────────────────

export const STRATEGY_COMPETITION_SYSTEM_PROMPT = `You are a senior brand strategist specializing in competitive analysis and strategic planning. You will receive structured extraction data from a company's website.

You must respond with a valid JSON object with these keys:

{
  "competitors": [
    {
      "confidence": number (0-100),
      "name": string,
      "fields": {
        "description": string (max 300 chars),
        "websiteUrl": string | null,
        "tier": string (one of: "DIRECT", "INDIRECT", "ASPIRATIONAL"),
        "valueProposition": string | null,
        "targetAudience": string | null,
        "differentiators": string[] (max 5),
        "mainOfferings": string[] (max 5),
        "strengths": string[] (max 4),
        "weaknesses": string[] (max 4),
        "toneOfVoice": string | null,
        "competitiveScore": number (0-100)
      }
    }
  ] (0-5 competitors),
  "strategyHints": {
    "objectives": string[] (3-5 strategic objectives inferred from the website),
    "focusAreas": string[] (3-5 key focus areas for the brand)
  },
  "trendSignals": [
    {
      "title": string,
      "description": string (max 200 chars),
      "category": string (one of: "CONSUMER_BEHAVIOR", "TECHNOLOGY", "MARKET_DYNAMICS", "COMPETITIVE", "REGULATORY")
    }
  ] (0-5 trend signals detected)
}

Guidelines:
- Competitors should only include those actually mentioned or implied on the website. Use the mentionedCompetitors from extraction data as primary source.
- Confidence scores reflect data quality. A competitor merely mentioned by name with no details should score below 30.
- LEAVE FIELDS EMPTY ("") rather than hallucinate. Only populate fields with evidence from the data.
- Strategic objectives should be inferred from the company's messaging, product roadmap signals, and hiring page themes.
- Focus areas should reflect the brand's current strategic priorities based on website emphasis.
- Trend signals should be industry/market trends detectable from the website content (e.g. mentions of AI, sustainability, remote work).
- Tier classification: DIRECT = same market & audience, INDIRECT = adjacent market or different approach, ASPIRATIONAL = industry leader the brand looks up to.`;

// ─── Shared analysis prompt builder ──────────────────────────

/**
 * Format extraction data into a user prompt for analysis calls.
 */
export function buildAnalysisUserPrompt(
  extraction: WebsiteExtraction,
  companyName: string,
): string {
  const profile = extraction.companyProfile;
  const parts: string[] = [
    `Analyze the following structured data extracted from ${companyName}'s website and generate the requested brand framework content.`,
    '',
    '=== COMPANY PROFILE ===',
    `Name: ${profile?.name ?? companyName}`,
  ];

  if (profile?.tagline) {
    parts.push(`Tagline: ${profile.tagline}`);
  }
  if (profile?.description) {
    parts.push(`Description: ${profile.description}`);
  }
  if (profile?.industry) {
    parts.push(`Industry: ${profile.industry}`);
  }
  if (profile?.foundingYear) {
    parts.push(`Founded: ${profile.foundingYear}`);
  }
  if (profile?.headquarters) {
    parts.push(`HQ: ${profile.headquarters}`);
  }
  if (profile?.employeeRange) {
    parts.push(`Size: ${profile.employeeRange} employees`);
  }

  const products = extraction.productsAndServices ?? [];
  if (products.length > 0) {
    parts.push('');
    parts.push('=== PRODUCTS & SERVICES ===');
    for (const product of products) {
      parts.push(`- ${product.name}: ${product.description}`);
      if (product.features?.length > 0) {
        parts.push(`  Features: ${product.features.join(', ')}`);
      }
      if (product.benefits?.length > 0) {
        parts.push(`  Benefits: ${product.benefits.join(', ')}`);
      }
      if (product.pricingModel) {
        parts.push(`  Pricing: ${product.pricingModel}`);
      }
    }
  }

  const audiences = extraction.targetAudience ?? [];
  if (audiences.length > 0) {
    parts.push('');
    parts.push('=== TARGET AUDIENCE ===');
    for (const audience of audiences) {
      parts.push(`- ${audience.name}: ${audience.description}`);
      if (audience.needs?.length > 0) {
        parts.push(`  Needs: ${audience.needs.join(', ')}`);
      }
      if (audience.painPoints?.length > 0) {
        parts.push(`  Pain Points: ${audience.painPoints.join(', ')}`);
      }
    }
  }

  parts.push('');
  parts.push('=== BRAND SIGNALS ===');
  const signals = extraction.brandSignals;
  if (signals) {
    parts.push(`Tone: ${signals.toneDescription}`);
    parts.push(`Writing Style: ${signals.writingStyle}`);
    if (signals.keyThemes?.length > 0) {
      parts.push(`Key Themes: ${signals.keyThemes.join(', ')}`);
    }
    if (signals.wordsUsed?.length > 0) {
      parts.push(`Characteristic Words: ${signals.wordsUsed.join(', ')}`);
    }
  }

  const competitors = extraction.mentionedCompetitors ?? [];
  if (competitors.length > 0) {
    parts.push('');
    parts.push('=== MENTIONED COMPETITORS ===');
    for (const comp of competitors) {
      parts.push(`- ${comp.name} (${comp.relationship})`);
    }
  }

  const visual = extraction.visualBranding;
  if (visual?.primaryColors?.length > 0 || visual?.logoDescription) {
    parts.push('');
    parts.push('=== VISUAL BRANDING ===');
    if (visual.primaryColors?.length > 0) {
      parts.push(`Colors: ${visual.primaryColors.join(', ')}`);
    }
    if (visual.logoDescription) {
      parts.push(`Logo: ${visual.logoDescription}`);
    }
  }

  parts.push('');
  parts.push('Respond with a JSON object following the schema described in your instructions.');

  return parts.join('\n');
}
