export type WorkshopStatus =
  | "TO_BUY"
  | "PURCHASED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface WorkshopStep {
  id: string;
  workshopId: string;
  stepNumber: number;
  title: string;
  duration: string;
  instructions: string | null;
  prompt: string | null;
  response: string | null;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface WorkshopFinding {
  id: string;
  workshopId: string;
  order: number;
  content: string;
}

export interface WorkshopRecommendation {
  id: string;
  workshopId: string;
  order: number;
  content: string;
  isCompleted: boolean;
}

export interface WorkshopParticipant {
  id: string;
  workshopId: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

export interface WorkshopNote {
  id: string;
  workshopId: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  createdAt: string;
}

export interface WorkshopPhoto {
  id: string;
  workshopId: string;
  url: string;
  caption: string | null;
  order: number;
}

export interface WorkshopObjective {
  id: string;
  workshopId: string;
  content: string;
  isCompleted: boolean;
  order: number;
}

export interface WorkshopAgendaItem {
  id: string;
  workshopId: string;
  time: string;
  activity: string;
  duration: string;
  details: string | null;
  order: number;
}

export interface Workshop {
  id: string;
  brandAssetId: string;
  status: WorkshopStatus;
  bundleId: string | null;
  selectedAssetIds: string[];
  workshopCount: number;
  hasFacilitator: boolean;
  totalPrice: number | null;
  purchasedAt: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  title: string | null;
  currentStep: number;
  timerSeconds: number;
  bookmarkStep: number | null;
  facilitatorName: string | null;
  presentationUrl: string | null;
  completedAt: string | null;
  participantCount: number | null;
  durationMinutes: number | null;
  canvasData: Record<string, unknown> | null;
  canvasLocked: boolean;
  reportGenerated: boolean;
  executiveSummary: string | null;
  steps: WorkshopStep[];
  findings: WorkshopFinding[];
  recommendations: WorkshopRecommendation[];
  participants: WorkshopParticipant[];
  notes: WorkshopNote[];
  photos: WorkshopPhoto[];
  objectives: WorkshopObjective[];
  agendaItems: WorkshopAgendaItem[];
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopBundle {
  id: string;
  name: string;
  badge: string | null;
  description: string | null;
  assetNames: string[];
  basePrice: number;
  discount: number;
  finalPrice: number;
  workspaceId: string;
  createdAt: string;
}
