// ─── Enums ─────────────────────────────────────────────────

export type StrategyType =
  | "GROWTH"
  | "MARKET_ENTRY"
  | "PRODUCT_LAUNCH"
  | "BRAND_BUILDING"
  | "OPERATIONAL_EXCELLENCE"
  | "CUSTOM";

export type StrategyStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type ObjectiveStatus = "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";

export type KeyResultStatus = "ON_TRACK" | "COMPLETE" | "BEHIND";

export type MilestoneStatus = "DONE" | "UPCOMING" | "FUTURE";

export type MetricType = "PERCENTAGE" | "NUMBER" | "CURRENCY";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

// ─── List Types ────────────────────────────────────────────

export interface StrategyWithMeta {
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

export interface StrategyStats {
  active: number;
  onTrack: number;
  atRisk: number;
  currentPeriod: string;
}

// ─── Detail Types ──────────────────────────────────────────

export interface KeyResultItem {
  id: string;
  description: string;
  status: KeyResultStatus;
  progressValue: string | null;
  sortOrder: number;
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
  focusArea: { id: string; name: string } | null;
}

export interface FocusAreaDetail {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  objectiveCount: number;
}

export interface MilestoneItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  quarter: string;
  status: MilestoneStatus;
  completedAt: string | null;
}

export interface StrategyDetailResponse extends Omit<StrategyWithMeta, 'objectives'> {
  vision: string | null;
  rationale: string | null;
  keyAssumptions: string[];
  objectives: ObjectiveWithKeyResults[];
  focusAreaDetails: FocusAreaDetail[];
  milestones: MilestoneItem[];
  linkedCampaigns: never[];
}

// ─── Body Types ────────────────────────────────────────────

export interface CreateStrategyBody {
  name: string;
  description: string;
  type?: StrategyType;
  startDate?: string;
  endDate?: string;
  vision?: string;
  focusAreas?: string[];
}

export interface UpdateStrategyBody {
  name?: string;
  description?: string;
  type?: StrategyType;
  status?: StrategyStatus;
  startDate?: string;
  endDate?: string;
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
}

export interface UpdateObjectiveBody {
  title?: string;
  description?: string;
  status?: ObjectiveStatus;
  priority?: Priority;
  focusAreaId?: string | null;
  metricType?: MetricType;
  startValue?: number;
  targetValue?: number;
  currentValue?: number;
}

export interface CreateKeyResultBody {
  description: string;
  status?: KeyResultStatus;
  progressValue?: string;
}

export interface UpdateKeyResultBody {
  description?: string;
  status?: KeyResultStatus;
  progressValue?: string;
}

export interface CreateMilestoneBody {
  title: string;
  description?: string;
  date: string;
  quarter?: string;
  status?: MilestoneStatus;
}

export interface UpdateMilestoneBody {
  title?: string;
  description?: string;
  date?: string;
  quarter?: string;
  status?: MilestoneStatus;
}

export interface UpdateContextBody {
  vision?: string;
  rationale?: string;
  keyAssumptions?: string[];
}
