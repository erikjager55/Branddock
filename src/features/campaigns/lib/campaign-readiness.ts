/**
 * Campaign-level traffic light derivation.
 *
 * Mirrors the content-level traffic light system (calendar-cards.tsx)
 * but operates on campaign-summary data instead of deliverable data.
 */

import type { TrafficLight } from "../components/shared/calendar-cards";

export { TRAFFIC_LIGHT } from "../components/shared/calendar-cards";

export function deriveCampaignTrafficLight(campaign: {
  status: string;
  deliverableCount: number;
  completedDeliverableCount: number;
}): { light: TrafficLight; label: string } {
  // Green: campaign completed, or all deliverables done
  if (
    campaign.status === "COMPLETED" ||
    (campaign.deliverableCount > 0 &&
      campaign.completedDeliverableCount >= campaign.deliverableCount)
  ) {
    return { light: "green", label: "Completed" };
  }

  // Red: no deliverables yet, or archived
  if (campaign.status === "ARCHIVED") {
    return { light: "red", label: "Archived" };
  }
  if (campaign.deliverableCount === 0) {
    return { light: "red", label: "No content" };
  }

  // Amber: active, in progress
  const progress = Math.round(
    (campaign.completedDeliverableCount / campaign.deliverableCount) * 100,
  );
  return {
    light: "amber",
    label: progress > 0 ? `${progress}% complete` : "In progress",
  };
}
