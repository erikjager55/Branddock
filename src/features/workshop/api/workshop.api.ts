import type { Workshop, WorkshopBundle, WorkshopNote } from "../types/workshop.types";
import type {
  PurchasePayload,
  PreviewImpactResponse,
} from "../types/workshop-purchase.types";

// ─── Session + Results API ──────────────────────────────────

export async function fetchWorkshopDetail(
  workshopId: string,
): Promise<{ workshop: Workshop }> {
  const res = await fetch(`/api/workshops/${workshopId}`);
  if (!res.ok) throw new Error("Failed to fetch workshop detail");
  return res.json();
}

export async function startWorkshop(
  workshopId: string,
): Promise<{ id: string; status: string; currentStep: number }> {
  const res = await fetch(`/api/workshops/${workshopId}/start`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start workshop");
  return res.json();
}

export async function updateStepResponse(
  workshopId: string,
  stepNumber: number,
  data: { response?: string; isCompleted?: boolean },
): Promise<{ step: unknown; progress: number }> {
  const res = await fetch(
    `/api/workshops/${workshopId}/steps/${stepNumber}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error("Failed to update step");
  return res.json();
}

export async function syncTimer(
  workshopId: string,
  timerSeconds: number,
): Promise<{ timerSeconds: number }> {
  const res = await fetch(`/api/workshops/${workshopId}/timer`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timerSeconds }),
  });
  if (!res.ok) throw new Error("Failed to sync timer");
  return res.json();
}

export async function updateBookmark(
  workshopId: string,
  bookmarkStep: number | null,
): Promise<{ bookmarkStep: number | null }> {
  const res = await fetch(`/api/workshops/${workshopId}/bookmark`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookmarkStep }),
  });
  if (!res.ok) throw new Error("Failed to update bookmark");
  return res.json();
}

export async function completeWorkshop(
  workshopId: string,
): Promise<{ workshop: { id: string; status: string; completedAt: string | null; durationMinutes: number | null }; reportGenerating: boolean }> {
  const res = await fetch(`/api/workshops/${workshopId}/complete`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to complete workshop");
  return res.json();
}

export async function fetchWorkshopReport(workshopId: string): Promise<{
  reportGenerated: boolean;
  executiveSummary: string | null;
  findings: { id: string; order: number; content: string }[];
  recommendations: { id: string; order: number; content: string; isCompleted: boolean }[];
  canvasData: Record<string, unknown> | null;
  canvasLocked: boolean;
}> {
  const res = await fetch(`/api/workshops/${workshopId}/report`);
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
}

export async function updateCanvas(
  workshopId: string,
  data: { canvasData: Record<string, unknown>; canvasLocked?: boolean },
): Promise<{ canvasData: Record<string, unknown>; canvasLocked?: boolean }> {
  const res = await fetch(`/api/workshops/${workshopId}/canvas`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update canvas");
  return res.json();
}

export async function fetchWorkshopNotes(
  workshopId: string,
): Promise<{ notes: WorkshopNote[] }> {
  const res = await fetch(`/api/workshops/${workshopId}/notes`);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

export async function addWorkshopNote(
  workshopId: string,
  data: { authorName: string; authorRole?: string; content: string },
): Promise<{ note: WorkshopNote }> {
  const res = await fetch(`/api/workshops/${workshopId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add note");
  return res.json();
}

export async function fetchWorkshopRaw(
  workshopId: string,
): Promise<{ workshop: Workshop }> {
  const res = await fetch(`/api/workshops/${workshopId}/report/raw`);
  if (!res.ok) throw new Error("Failed to fetch raw data");
  return res.json();
}

export async function generateWorkshopReport(
  workshopId: string,
): Promise<{ status: string; executiveSummary: string; findingsCount: number; recommendationsCount: number }> {
  const res = await fetch(`/api/workshops/${workshopId}/generate-report`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate report");
  return res.json();
}

// ─── Purchase API ───────────────────────────────────────────

export async function fetchWorkshops(
  assetId: string
): Promise<{ workshops: Workshop[]; bundles: WorkshopBundle[] }> {
  const res = await fetch(`/api/brand-assets/${assetId}/workshops`);
  if (!res.ok) throw new Error("Failed to fetch workshops");
  return res.json();
}

export async function fetchBundles(
  assetId: string
): Promise<{ bundles: WorkshopBundle[] }> {
  const res = await fetch(`/api/brand-assets/${assetId}/workshops/bundles`);
  if (!res.ok) throw new Error("Failed to fetch bundles");
  return res.json();
}

export async function purchaseWorkshop(
  assetId: string,
  payload: PurchasePayload
): Promise<{ workshop: Workshop; totalPrice: number }> {
  const res = await fetch(`/api/brand-assets/${assetId}/workshops/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to purchase workshop");
  return res.json();
}

export async function previewImpact(
  assetId: string,
  payload: { selectedAssetIds: string[] }
): Promise<PreviewImpactResponse> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/workshops/preview-impact`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error("Failed to preview impact");
  return res.json();
}
