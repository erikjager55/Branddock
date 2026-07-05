/**
 * Campaign-level traffic light derivation.
 *
 * Mirrors the content-level traffic light system (calendar-cards.tsx)
 * but operates on campaign-summary data instead of deliverable data.
 */

import type { TrafficLight } from "../components/shared/calendar-cards";

export { TRAFFIC_LIGHT } from "../components/shared/calendar-cards";

export type CampaignTrafficLightKey =
  | "completed"
  | "archived"
  | "noContent"
  | "percentComplete"
  | "inProgress";

export function deriveCampaignTrafficLight(campaign: {
  status: string;
  deliverableCount: number;
  completedDeliverableCount: number;
}): {
  light: TrafficLight;
  label: string;
  key: CampaignTrafficLightKey;
  progress: number;
} {
  const progress =
    campaign.deliverableCount > 0
      ? Math.round(
          (campaign.completedDeliverableCount / campaign.deliverableCount) * 100,
        )
      : 0;

  // Green: campaign completed, or all deliverables done
  if (
    campaign.status === "COMPLETED" ||
    (campaign.deliverableCount > 0 &&
      campaign.completedDeliverableCount >= campaign.deliverableCount)
  ) {
    return { light: "green", label: "Completed", key: "completed", progress };
  }

  // Red: no deliverables yet, or archived
  if (campaign.status === "ARCHIVED") {
    return { light: "red", label: "Archived", key: "archived", progress };
  }
  if (campaign.deliverableCount === 0) {
    return { light: "red", label: "No content", key: "noContent", progress };
  }

  // Amber: active, in progress
  if (progress > 0) {
    return {
      light: "amber",
      label: `${progress}% complete`,
      key: "percentComplete",
      progress,
    };
  }
  return { light: "amber", label: "In progress", key: "inProgress", progress };
}
