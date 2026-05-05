/**
 * scripts/fidelity/judge-prompts.ts
 *
 * Judge-prompt templates voor de drift-meting LLM-evaluatie.
 * Implementeert docs/fidelity/judge-prompt.md sectie 4.
 *
 * Eén batched request per output per judge — alle 4 dimensies gescoord
 * in één JSON response, met expliciete per-dimensie evaluation om
 * halo-effecten te beperken.
 */

export const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator of brand-aligned content quality. You assess whether generated content authentically reflects a brand's declared voice, tone, and identity.

You will receive:
1. A brand voice declaration (the brand's stated personality, tone, vocabulary, and style)
2. A piece of generated content (typically long-form: blog post, case study, or thought leadership piece)
3. Four evaluation dimensions to score independently

Score each dimension on a 1-10 integer scale:
- 1-2: Severely off-brand, unrecognizable
- 3-4: Off-brand, multiple violations
- 5-6: Partial match, mixed signals
- 7-8: Good match, minor inconsistencies
- 9-10: Strong match, fully on-brand

CRITICAL — avoid these biases:
- Verbosity bias: do NOT reward longer outputs unless extra length adds informative value
- Self-preference bias: do NOT favor content that resembles your own typical outputs
- Halo effect: score each dimension INDEPENDENTLY; do not let one strong/weak signal influence others

Return strict JSON only — no preamble, no markdown fence.`;

export const DIMENSION_DEFINITIONS = {
  voiceFit: `Voice-fit measures whether the content authentically reflects the brand's declared personality dimensions, tone positioning, vocabulary preferences, and stylistic guidelines. Compare against:
- Aaker dimension scores and primary/secondary dimension
- Spectrum slider positions (formal↔casual, etc.)
- Tone dimensions (formal↔casual, serious↔funny, etc.)
- "Words we use" and "Words we avoid" lists
- Channel-specific tone guidance
Do not score for general writing quality — that is dimension 4 (Fluency).
Do not score for whether the content is recognizable as the brand — that is dimension 2 (Brand-recognition).`,

  brandRecognition: `Brand-recognition measures whether a knowledgeable reader, shown only this content without the brand name, could plausibly identify it as belonging to this specific brand based on distinctive voice markers. Higher score = more distinctive. Lower score = generic, could be any brand in the same industry.
Look for: signature phrases, distinctive metaphors, characteristic sentence structures, specific vocabulary patterns. Generic professional writing scores 4-5 even if voice-fit is high.`,

  naturalness: `Naturalness measures whether the content reads as written by an experienced human writer, versus reading as AI-generated output. Score lower for: repetitive phrasing, hedge-heavy openings, formulaic transitions, over-explained obvious points, generic AI tropes ("In today's fast-paced world..."), bullet-list addiction, robotic parallelism.
Score independent of brand voice match — a piece can be on-brand but feel AI-written, or off-brand but feel human-written.`,

  fluency: `Fluency measures grammatical correctness and reading flow. Score lower for: grammar errors, awkward sentence structures, unclear referents, broken parallelism, run-on sentences, choppy paragraphs, language inconsistencies (e.g., partial English in Dutch content).
This is the most objective dimension. Both judges should agree closely on fluency scores; large disagreement here suggests one judge is unreliable.`,
};

export function buildJudgeUserPrompt(opts: {
  brandVoiceDeclaration: string;
  generatedContent: string;
  wordCount: number;
  contentType: string;
}): string {
  return `## Brand voice declaration

${opts.brandVoiceDeclaration}

## Generated content (length: ${opts.wordCount} words, content type: ${opts.contentType})

${opts.generatedContent}

## Evaluation task

Score the following four dimensions INDEPENDENTLY for the generated content above:

### Dimension 1: voiceFit
${DIMENSION_DEFINITIONS.voiceFit}

### Dimension 2: brandRecognition
${DIMENSION_DEFINITIONS.brandRecognition}

### Dimension 3: naturalness
${DIMENSION_DEFINITIONS.naturalness}

### Dimension 4: fluency
${DIMENSION_DEFINITIONS.fluency}

Return JSON with this exact shape:
{
  "scores": {
    "voiceFit":          { "score": <integer 1-10>, "reasoning": "<2-3 sentences citing specific passages>", "exampleStrong": "<short quote or empty>", "exampleWeak": "<short quote or empty>" },
    "brandRecognition":  { "score": <integer 1-10>, "reasoning": "...", "exampleStrong": "...", "exampleWeak": "..." },
    "naturalness":       { "score": <integer 1-10>, "reasoning": "...", "exampleStrong": "...", "exampleWeak": "..." },
    "fluency":           { "score": <integer 1-10>, "reasoning": "...", "exampleStrong": "...", "exampleWeak": "..." }
  }
}`;
}
