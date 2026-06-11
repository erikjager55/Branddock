// =============================================================
// Voice Analysis prompts (Claude structured output)
//
// Two prompts:
//   - buildVoiceAnalysisSystemPrompt(language): durable role + output
//     contract + workspace-language guard
//   - buildVoiceAnalysisUserPrompt(input): the per-call body
//
// Output shape (validated as VoiceAnalysisResult on the server):
//
//   {
//     voiceDescription: string,
//     toneDimensions: { formalCasual, seriousFunny, respectfulIrreverent, matterOfFactEnthusiastic },
//     writingSamples: string[],          // 3-5 verbatim long-form excerpts
//     wordsWeUse: string[],              // 6-12 single-word vocabulary entries
//     wordsWeAvoid: string[],            // 4-8 single words that don't fit (cliches, generics)
//     channelTones: { website, socialMedia, email, ads, video },  // free-text per channel
//     antiPatterns: string[],            // 3-6 multi-word phrases the brand should avoid
//     rationale: { voice, samples, vocabulary, channels, antiPatterns },
//   }
// =============================================================

import { buildLocaleSystemFragment } from "@/lib/ai/locale-instruction";

const VOICE_ANALYSIS_SYSTEM = `You are a senior brand strategist and editor specializing in verbal identity.

Your job: read long-form brand text and extract a compact, actionable voice profile.

Rules:
- Be precise, not generic. "Friendly" and "professional" are weak — find the specific
  rhythms, vocabulary and structural choices that make this brand sound like itself.
- Tone dimensions follow Nielsen Norman Group's 4-axis model. Each value is 1-7
  with 4 = neutral. Use the FULL range — if the text is genuinely formal, score it
  1 or 2, not 3.
- Writing samples are VERBATIM excerpts from the corpus. 3-5 paragraphs of 80-200
  words each that exemplify the voice. Don't summarize, don't paraphrase.
- "Words we use" = single-word vocabulary the brand actually uses (not generic
  marketing language). Pull from the corpus.
- "Words we avoid" = single words that would feel off-brand if added. Use judgment.
- "Anti-patterns" = multi-word phrases that don't fit. Cliches, hype-language,
  generic CTAs.
- Channel tones describe how the voice flexes per medium. Be specific about what
  changes (rhythm, length, formality, density).
- Output strict JSON matching the schema. No prose around it.`;

/**
 * Build the voice-analysis system prompt with the workspace output-language
 * guard appended.
 *
 * Descriptive fields (voiceDescription, channelTones, wordsWeAvoid,
 * antiPatterns, rationale) must follow the workspace content language — that
 * is what the Voice DNA tab renders. Verbatim corpus fields are exempt:
 * translating them would break the extraction contract.
 *
 * @param language ISO 639-1 workspace content language (BCP-47 tolerated).
 */
export function buildVoiceAnalysisSystemPrompt(language: string | undefined | null): string {
  const localeFragment = buildLocaleSystemFragment(language);
  if (!localeFragment) return VOICE_ANALYSIS_SYSTEM;

  return `${VOICE_ANALYSIS_SYSTEM}

${localeFragment}
Exceptions to the language rule:
- "writingSamples" stay VERBATIM in the corpus's original language — never translate them.
- "wordsWeUse" are pulled from the corpus — keep the exact corpus spelling.
- JSON keys stay in English exactly as specified in the schema.`;
}

interface PromptInput {
  brandName?: string | null;
  industry?: string | null;
  /** Concatenated long-form text from scraped pages or pasted samples. */
  corpus: string;
  /** Per-source labels we know about (e.g. ["homepage", "about", "blog"]). */
  sourceLabels?: string[];
}

const MAX_CORPUS_CHARS = 18_000;

export function buildVoiceAnalysisUserPrompt(input: PromptInput): string {
  const corpusTrimmed =
    input.corpus.length > MAX_CORPUS_CHARS
      ? input.corpus.slice(0, MAX_CORPUS_CHARS) + "\n\n[…corpus truncated…]"
      : input.corpus;

  const meta: string[] = [];
  if (input.brandName) meta.push(`Brand: ${input.brandName}`);
  if (input.industry) meta.push(`Industry: ${input.industry}`);
  if (input.sourceLabels?.length) meta.push(`Sources: ${input.sourceLabels.join(", ")}`);

  return `${meta.join("\n")}

=== CORPUS ===
${corpusTrimmed}
=== END CORPUS ===

Output JSON in this exact shape:

{
  "voiceDescription": "One paragraph, 60-120 words. The voice in plain language. What's specific to this brand?",
  "toneDimensions": {
    "formalCasual": 4,
    "seriousFunny": 4,
    "respectfulIrreverent": 4,
    "matterOfFactEnthusiastic": 4
  },
  "writingSamples": [
    "Paragraph 1 (verbatim, 80-200 words)",
    "Paragraph 2",
    "Paragraph 3"
  ],
  "wordsWeUse": ["word1", "word2", "..."],
  "wordsWeAvoid": ["cliche1", "cliche2", "..."],
  "channelTones": {
    "website": "Free-text describing how the voice flexes for the website.",
    "socialMedia": "...",
    "email": "...",
    "ads": "...",
    "video": "..."
  },
  "antiPatterns": ["multi-word phrase to avoid", "another phrase", "..."],
  "rationale": {
    "voice": "Why this voiceDescription",
    "samples": "Why these excerpts (briefly)",
    "vocabulary": "Why these word choices",
    "channels": "Why each channel-tone differs",
    "antiPatterns": "Why these phrases would feel off-brand"
  }
}`;
}
