// =============================================================
// Brand Voiceguide types
// =============================================================

export type ToneAxis =
  | "formalCasual"
  | "seriousFunny"
  | "respectfulIrreverent"
  | "matterOfFactEnthusiastic";

/**
 * 4-axis NN/g tone-of-voice score. Each axis: 1-7 with 4 = neutral.
 *  - formalCasual:           1=Formal,         7=Casual
 *  - seriousFunny:           1=Serious,        7=Funny
 *  - respectfulIrreverent:   1=Respectful,     7=Irreverent
 *  - matterOfFactEnthusiastic: 1=Matter-of-fact, 7=Enthusiastic
 */
export type ToneDimensions = Record<ToneAxis, number>;

export type ChannelKey = "website" | "socialMedia" | "email" | "ads" | "video";

/**
 * Per-channel tone override. Free-text description + optional dominant
 * axis-shift relative to the global baseline (e.g. "casualer dan baseline").
 */
export interface ChannelToneEntry {
  description: string;
  axisShift?: { axis: ToneAxis; direction: "increase" | "decrease" } | null;
}

export type ChannelTones = Partial<Record<ChannelKey, ChannelToneEntry>>;

export interface ExamplePhrase {
  text: string;
  type: "do" | "dont";
}

export interface BrandVoiceguide {
  id: string;
  workspaceId: string;
  contentLocale: 'nl-NL' | 'nl-BE' | 'en-GB' | 'de-DE' | null;
  voiceDescription: string | null;
  toneDimensions: ToneDimensions | null;
  writingSamples: string[];
  wordsWeUse: string[];
  wordsWeAvoid: string[];
  channelTones: ChannelTones | null;
  antiPatterns: string[];
  // Verhuisd uit BrandStyleguide (ADR 2026-05-15)
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: ExamplePhrase[] | null;
  centroidComputedAt: string | null;
  voiceDnaSavedForAi: boolean;
  vocabularySavedForAi: boolean;
  channelTonesSavedForAi: boolean;
  antiPatternsSavedForAi: boolean;
  referencesSavedForAi: boolean;
  // Verhuisd uit BrandStyleguide.toneSavedForAi gesplitst (ADR 2026-05-15)
  guidelinesSavedForAi: boolean;
  examplePhrasesSavedForAi: boolean;
  source: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBrandVoiceguideBody {
  voiceDescription?: string | null;
  /**
   * BCP-47 locale die F-VAL pijler-3 heuristic-pack-keuze stuurt.
   * Whitelist: 'nl-NL' / 'nl-BE' / 'en-GB' / 'de-DE' / null (= reset
   * naar workspace.contentLanguage fallback per locale-resolver-precedence).
   */
  contentLocale?: 'nl-NL' | 'nl-BE' | 'en-GB' | 'de-DE' | null;
  toneDimensions?: ToneDimensions | null;
  writingSamples?: string[];
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  channelTones?: ChannelTones | null;
  antiPatterns?: string[];
  contentGuidelines?: string[];
  writingGuidelines?: string[];
  examplePhrases?: ExamplePhrase[] | null;
  voiceDnaSavedForAi?: boolean;
  vocabularySavedForAi?: boolean;
  channelTonesSavedForAi?: boolean;
  antiPatternsSavedForAi?: boolean;
  referencesSavedForAi?: boolean;
  guidelinesSavedForAi?: boolean;
  examplePhrasesSavedForAi?: boolean;
  source?: string;
}

export type SaveForAiSection =
  | "voice-dna"
  | "vocabulary"
  | "channel-tones"
  | "anti-patterns"
  | "references"
  | "guidelines"
  | "example-phrases";

export interface RecomputeCentroidResponse {
  ok: true;
  samples: number;
  dim: number;
  computedAt: string | null;
}

export interface MigrateFromPersonalityResponse {
  voiceguide: BrandVoiceguide;
  centroidComputed: boolean;
  source: "extracted";
}

// ─── Analyzer types ─────────────────────────────────────────

export type VoiceAnalysisStatus =
  | "PENDING"
  | "SCRAPING"
  | "EXTRACTING"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

export interface VoiceAnalysisStartResponse {
  jobId: string;
}

export interface VoiceAnalysisProgress {
  jobId: string;
  status: VoiceAnalysisStatus;
  progress: number; // 0..100
  currentStep: string | null;
  errors: string[];
  result: VoiceAnalysisResult | null;
}

/** Suggestions extracted by the AI analyzer. User reviews + accepts. */
export interface VoiceAnalysisResult {
  voiceDescription: string;
  toneDimensions: ToneDimensions;
  writingSamples: string[];
  wordsWeUse: string[];
  wordsWeAvoid: string[];
  channelTones: ChannelTones;
  antiPatterns: string[];
  /** Human-readable rationale per section — surfaced in the review UI */
  rationale: {
    voice?: string;
    samples?: string;
    vocabulary?: string;
    channels?: string;
    antiPatterns?: string;
  };
}
