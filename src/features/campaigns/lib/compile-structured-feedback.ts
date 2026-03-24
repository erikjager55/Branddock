import type { PersonaValidationResult } from "@/lib/campaigns/strategy-blueprint.types";

interface CompileStructuredFeedbackParams {
  freeText: string;
  endorsedPersonaIds: string[];
  strategyRatings: Record<string, { rating: "up" | "down"; comment?: string }>;
  personaValidation: PersonaValidationResult[];
}

/** Rating key → human-readable label (without variant prefix) */
const RATING_LABELS: Record<string, string> = {
  humanInsight: "Human Insight",
  culturalTension: "Cultural Tension",
  creativePlatform: "Creative Platform (Big Idea)",
  creativeTerritory: "Creative Territory",
  brandRole: "Brand Role",
  memorableDevice: "Memorable Device",
  effieRationale: "Effie Award Rationale",
  campaignTheme: "Campaign Theme",
  theme: "Campaign Theme",
  positioning: "Positioning Statement",
  "messaging.brand": "Brand Message",
  "messaging.campaign": "Campaign Message",
  "messaging.proofPoints": "Proof Points",
  "jtbd.statement": "Job Statement",
};

function getRatingLabel(key: string): string {
  // Strip variant or concept prefix (e.g. "A.theme" → "Variant A: ", "concept.creativePlatform" → "Concept: ")
  const prefixMatch = key.match(/^([ABC]|concept)\.(.+)$/);
  const prefix = prefixMatch
    ? /^[ABC]$/.test(prefixMatch[1])
      ? `Variant ${prefixMatch[1]}: `
      : "Concept: "
    : "";
  const rest = prefixMatch ? prefixMatch[2] : key;

  // Touchpoint ratings: "phase.0.tp.1" → "Phase 1, Touchpoint 2"
  const tpMatch = rest.match(/^phase\.(\d+)\.tp\.(\d+)$/);
  if (tpMatch) return `${prefix}Phase ${parseInt(tpMatch[1], 10) + 1}, Touchpoint ${parseInt(tpMatch[2], 10) + 1}`;

  // Phase ratings: "phase.0" → "Phase 1"
  const phaseMatch = rest.match(/^phase\.(\d+)$/);
  if (phaseMatch) return `${prefix}Journey Phase ${parseInt(phaseMatch[1], 10) + 1}`;

  // Choice ratings: "choice.0" → "Strategic Choice #1"
  if (rest.startsWith("choice.")) return `${prefix}Strategic Choice #${parseInt(rest.split(".")[1], 10) + 1}`;

  // Known labels
  if (RATING_LABELS[rest]) return `${prefix}${RATING_LABELS[rest]}`;

  return `${prefix}${rest}`;
}

/**
 * Compiles interactive feedback (strategy ratings, persona endorsements, free text)
 * into a markdown-formatted string that the AI synthesizer can interpret.
 */
export function compileStructuredFeedback({
  freeText,
  endorsedPersonaIds,
  strategyRatings,
  personaValidation,
}: CompileStructuredFeedbackParams): string {
  const sections: string[] = [];

  // Strategy element ratings
  // Split ratings into variant (A/B/C) and concept groups for clarity
  const variantEntries = Object.entries(strategyRatings).filter(([k]) => /^[ABC]\./.test(k));
  const conceptEntries = Object.entries(strategyRatings).filter(([k]) => k.startsWith("concept."));
  const otherEntries = Object.entries(strategyRatings).filter(([k]) => !/^[ABC]\./.test(k) && !k.startsWith("concept."));
  const ratingEntries = [...variantEntries, ...conceptEntries, ...otherEntries];
  if (ratingEntries.length > 0) {
    const lines = ratingEntries.map(([key, entry]) => {
      const label = getRatingLabel(key);
      const status = entry.rating === "up" ? "APPROVED" : "NEEDS CHANGE";
      const commentSuffix = entry.comment ? ` — "${entry.comment}"` : "";
      return `- ${label}: ${status}${commentSuffix}`;
    });
    sections.push(
      "## Strategy Element Ratings\n" + lines.join("\n"),
    );
  }

  // Endorsed persona feedback
  const endorsedPersonas = personaValidation.filter((p) =>
    endorsedPersonaIds.includes(p.personaId),
  );
  if (endorsedPersonas.length > 0) {
    const personaBlocks = endorsedPersonas.map((p) => {
      const lines: string[] = [
        `### ${p.personaName} (Score: ${p.overallScore}/10, Prefers: ${p.preferredVariant})`,
        `Feedback: "${p.feedback}"`,
      ];
      if (p.resonates.length > 0) {
        lines.push(`Resonates: ${p.resonates.join(", ")}`);
      }
      if (p.concerns.length > 0) {
        lines.push(`Concerns: ${p.concerns.join(", ")}`);
      }
      if (p.suggestions.length > 0) {
        lines.push(`Suggestions: ${p.suggestions.join(", ")}`);
      }
      return lines.join("\n");
    });
    sections.push(
      "## Endorsed Persona Feedback\nThe user specifically endorsed the following personas' feedback as relevant for synthesis:\n\n" +
        personaBlocks.join("\n\n"),
    );
  }

  // Free text
  if (freeText.trim().length > 0) {
    sections.push("## Additional User Notes\n" + freeText.trim());
  }

  if (sections.length === 0) return freeText.trim();

  return "--- USER FEEDBACK ---\n\n" + sections.join("\n\n");
}
