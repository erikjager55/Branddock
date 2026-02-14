export type StrategyType = "GROWTH" | "MARKET_ENTRY" | "PRODUCT_LAUNCH" | "BRAND_BUILDING" | "OPERATIONAL_EXCELLENCE" | "CUSTOM";
export type StrategyStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type ObjectiveStatus = "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
export type KeyResultStatus = "ON_TRACK" | "COMPLETE" | "BEHIND";
export type MilestoneStatus = "DONE" | "UPCOMING" | "FUTURE";
export type MetricType = "PERCENTAGE" | "NUMBER" | "CURRENCY";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface BusinessStrategy {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: StrategyType;
  status: StrategyStatus;
  vision: string | null;
  rationale: string | null;
  keyAssumptions: string[];
  startDate: string | null;
  endDate: string | null;
  progressPercentage: number;
  objectives: ObjectiveWithKeyResults[];
  focusAreas: FocusAreaDetail[];
  milestones: MilestoneItem[];
  linkedCampaigns: LinkedCampaignPreview[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: StrategyType;
  status: StrategyStatus;
  progressPercentage: number;
  objectives: { total: number; onTrack: number; atRisk: number };
  focusAreas: string[];
  linkedCampaignCount: number;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
}

export interface ObjectiveWithKeyResults {
  id: string;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  priority: Priority;
  sortOrder: number;
  metricType: MetricType;
  startValue: number;
  targetValue: number;
  currentValue: number;
  keyResults: KeyResultItem[];
  linkedCampaigns: { id: string; name: string }[];
  focusArea: { id: string; name: string } | null;
}

export interface KeyResultItem {
  id: string;
  description: string;
  status: KeyResultStatus;
  progressValue: string | null;
  sortOrder: number;
}

export interface FocusAreaDetail {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  objectiveCount: number;
}

export interface MilestoneItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  quarter: string;
  status: MilestoneStatus;
}

export interface LinkedCampaignPreview {
  id: string;
  name: string;
  status: string;
}

export interface StrategyListResponse {
  strategies: StrategyListItem[];
  stats: StrategySummaryStats;
}

export interface StrategySummaryStats {
  active: number;
  onTrack: number;
  atRisk: number;
  currentPeriod: string;
}

// API Bodies
export interface CreateStrategyBody {
  name: string;
  description: string;
  type?: StrategyType;
  startDate?: string;
  endDate?: string;
  vision?: string;
  focusAreas?: string[];
}

export interface CreateObjectiveBody {
  title: string;
  description?: string;
  focusAreaId?: string;
  priority?: Priority;
  metricType?: MetricType;
  startValue?: number;
  targetValue: number;
  keyResults?: string[];
  linkedCampaignIds?: string[];
}

export interface CreateMilestoneBody {
  title: string;
  description?: string;
  date: string;
  quarter: string;
}

// Constanten
export const STRATEGY_TYPE_CONFIG: Record<StrategyType, { icon: string; label: string }> = {
  GROWTH: { icon: "TrendingUp", label: "Growth" },
  MARKET_ENTRY: { icon: "Globe", label: "Market Entry" },
  PRODUCT_LAUNCH: { icon: "Rocket", label: "Product Launch" },
  BRAND_BUILDING: { icon: "Award", label: "Brand Building" },
  OPERATIONAL_EXCELLENCE: { icon: "Settings", label: "Operational Excellence" },
  CUSTOM: { icon: "Puzzle", label: "Custom" },
};

export const METRIC_TYPE_CONFIG: Record<MetricType, { label: string; prefix?: string; suffix?: string }> = {
  PERCENTAGE: { label: "Percentage", suffix: "%" },
  NUMBER: { label: "Number" },
  CURRENCY: { label: "Currency", prefix: "€" },
};
