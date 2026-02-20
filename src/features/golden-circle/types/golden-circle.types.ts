export interface GoldenCircleData {
  whyStatement: string;
  whyDetails: string;
  howStatement: string;
  howDetails: string;
  whatStatement: string;
  whatDetails: string;
  isLocked: boolean;
  lastEditedAt: string | null;
  lastEditedBy: { id: string; name: string } | null;
}

export interface GoldenCircleVersion {
  id: string;
  version: number;
  changeNote: string | null;
  content: string | null;
  createdAt: string;
  changedBy: { id: string; name: string } | null;
}

export type GoldenCircleRing = 'why' | 'how' | 'what';
