/**
 * Reconcile Asset Plan with User Selections
 *
 * The AI Asset Planner runs in step 4 (Concept) before the user selects
 * deliverables in step 5. This utility aligns the blueprint's assetPlan
 * with the user's selections so the timeline matches what was chosen.
 *
 * Rules:
 * - Keep AI-generated deliverables that match user-selected types (rich briefs)
 * - Trim excess if AI generated more than the user wants
 * - Add stub entries if user selected types the AI didn't generate
 * - Remove AI-generated deliverables for types the user didn't select
 */

import type {
  AssetPlanDeliverable,
  AssetPlanLayer,
} from "@/lib/campaigns/strategy-blueprint.types";
import { getDeliverableTypeById } from "./deliverable-types";

interface SelectedDeliverable {
  type: string;
  quantity: number;
}

/**
 * Build a display-friendly title for a deliverable type.
 * Uses the registry name if available, otherwise formats the kebab-case ID.
 */
function buildTitle(typeId: string, index: number, total: number): string {
  const def = getDeliverableTypeById(typeId);
  const name = def?.name ?? typeId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return total > 1 ? `${name} #${index + 1}` : name;
}

/**
 * Create a minimal stub deliverable for a type the AI didn't generate.
 */
function createStub(
  typeId: string,
  index: number,
  total: number,
  fallbackPhase: string,
): AssetPlanDeliverable {
  const def = getDeliverableTypeById(typeId);
  return {
    title: buildTitle(typeId, index, total),
    contentType: typeId,
    channel: def?.category ?? "general",
    phase: fallbackPhase,
    targetPersonas: [],
    brief: {
      objective: "",
      keyMessage: "",
      toneDirection: "",
      callToAction: "",
      contentOutline: [],
    },
    productionPriority: "should-have",
    estimatedEffort: "medium",
    suggestedOrder: 99,
  };
}

/**
 * Reconcile the AI-generated asset plan with the user's deliverable selections.
 * Returns a new AssetPlanLayer — does not mutate the input.
 */
export function reconcileAssetPlan(
  currentPlan: AssetPlanLayer,
  selections: SelectedDeliverable[],
): AssetPlanLayer {
  if (selections.length === 0) return currentPlan;

  // Group AI-generated deliverables by contentType
  const aiByType = new Map<string, AssetPlanDeliverable[]>();
  for (const d of currentPlan.deliverables) {
    const key = d.contentType;
    if (!aiByType.has(key)) aiByType.set(key, []);
    aiByType.get(key)!.push(d);
  }

  // Determine a reasonable fallback phase from existing deliverables
  const fallbackPhase =
    currentPlan.deliverables[0]?.phase ?? "Launch";

  const reconciled: AssetPlanDeliverable[] = [];

  for (const sel of selections) {
    const aiItems = aiByType.get(sel.type) ?? [];

    if (aiItems.length >= sel.quantity) {
      // AI generated enough or more — keep the first N (they have rich briefs)
      reconciled.push(...aiItems.slice(0, sel.quantity));
    } else {
      // Keep all AI-generated ones, add stubs for the remainder
      reconciled.push(...aiItems);
      const remaining = sel.quantity - aiItems.length;
      for (let i = 0; i < remaining; i++) {
        reconciled.push(
          createStub(sel.type, aiItems.length + i, sel.quantity, fallbackPhase),
        );
      }
    }
  }

  return {
    ...currentPlan,
    deliverables: reconciled,
    totalDeliverables: reconciled.length,
  };
}
