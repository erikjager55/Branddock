import type { PersonaValidationResult } from "@/lib/campaigns/strategy-blueprint.types";

interface CompileStructuredFeedbackParams {
  freeText: string;
  endorsedPersonaIds: string[];
  strategyRatings: Record<string, "up" | "down">;
  personaValidation: PersonaValidationResult[];
}

/** Rating key → human-readable label */
const RATING_LABELS: Record<string, string> = {
  theme: "Campaign Theme",
  positioning: "Positioning Statement",
  "messaging.brand": "Brand Message",
  "messaging.campaign": "Campaign Message",
  "messaging.proofPoints": "Proof Points",
  "jtbd.statement": "Job Statement",
};

function getRatingLabel(key: string): string {
  if (RATING_LABELS[key]) return RATING_LABELS[key];
  if (key.startsWith("choice.")) return `Strategic Choice #${parseInt(key.split(".")[1], 10) + 1}`;
  return key;
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
  const ratingEntries = Object.entries(strategyRatings);
  if (ratingEntries.length > 0) {
    const lines = ratingEntries.map(([key, rating]) => {
      const label = getRatingLabel(key);
      return `- ${label}: ${rating === "up" ? "APPROVED" : "NEEDS CHANGE"}`;
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
