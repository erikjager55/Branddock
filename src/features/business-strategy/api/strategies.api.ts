import type {
  StrategyWithMeta,
  StrategyStats,
  StrategyDetailResponse,
  CreateStrategyBody,
  UpdateStrategyBody,
  UpdateContextBody,
  ObjectiveWithKeyResults,
  CreateObjectiveBody,
  UpdateObjectiveBody,
  CreateKeyResultBody,
  UpdateKeyResultBody,
  CreateMilestoneBody,
  UpdateMilestoneBody,
} from "../types/business-strategy.types";

const BASE = "/api/strategies";

// ─── List + Stats ──────────────────────────────────────────

export async function fetchStrategies(
  status?: string,
): Promise<{ strategies: StrategyWithMeta[] }> {
  const url = new URL(BASE, window.location.origin);
  if (status) url.searchParams.set("status", status);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch strategies");
  return res.json();
}

export async function fetchStrategyStats(): Promise<StrategyStats> {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch strategy stats");
  return res.json();
}

// ─── CRUD ──────────────────────────────────────────────────

export async function createStrategy(
  data: CreateStrategyBody,
): Promise<{ strategy: StrategyDetailResponse }> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create strategy");
  return res.json();
}

export async function fetchStrategyDetail(
  id: string,
): Promise<StrategyDetailResponse> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch strategy detail");
  return res.json();
}

export async function updateStrategy(
  id: string,
  data: UpdateStrategyBody,
): Promise<{ strategy: StrategyDetailResponse }> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update strategy");
  return res.json();
}

export async function archiveStrategy(
  id: string,
): Promise<{ strategy: StrategyDetailResponse }> {
  const res = await fetch(`${BASE}/${id}/archive`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to archive strategy");
  return res.json();
}

export async function deleteStrategy(id: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete strategy");
  return res.json();
}

// ─── Context ───────────────────────────────────────────────

export async function updateContext(
  id: string,
  data: UpdateContextBody,
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${id}/context`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update context");
  return res.json();
}

// ─── Objectives ────────────────────────────────────────────

export async function fetchObjectives(
  strategyId: string,
): Promise<{ objectives: ObjectiveWithKeyResults[] }> {
  const res = await fetch(`${BASE}/${strategyId}/objectives`);
  if (!res.ok) throw new Error("Failed to fetch objectives");
  return res.json();
}

export async function addObjective(
  strategyId: string,
  data: CreateObjectiveBody,
): Promise<{ objective: ObjectiveWithKeyResults }> {
  const res = await fetch(`${BASE}/${strategyId}/objectives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add objective");
  return res.json();
}

export async function updateObjective(
  strategyId: string,
  objectiveId: string,
  data: UpdateObjectiveBody,
): Promise<{ objective: ObjectiveWithKeyResults }> {
  const res = await fetch(`${BASE}/${strategyId}/objectives/${objectiveId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update objective");
  return res.json();
}

export async function deleteObjective(
  strategyId: string,
  objectiveId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/${strategyId}/objectives/${objectiveId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete objective");
  return res.json();
}

export async function reorderObjectives(
  strategyId: string,
  objectiveIds: string[],
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${strategyId}/objectives/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectiveIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder objectives");
  return res.json();
}

// ─── Key Results ───────────────────────────────────────────

export async function addKeyResult(
  strategyId: string,
  objectiveId: string,
  data: CreateKeyResultBody,
): Promise<{ keyResult: { id: string } }> {
  const res = await fetch(
    `${BASE}/${strategyId}/objectives/${objectiveId}/key-results`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error("Failed to add key result");
  return res.json();
}

export async function updateKeyResult(
  strategyId: string,
  objectiveId: string,
  keyResultId: string,
  data: UpdateKeyResultBody,
): Promise<{ keyResult: { id: string } }> {
  const res = await fetch(
    `${BASE}/${strategyId}/objectives/${objectiveId}/key-results/${keyResultId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error("Failed to update key result");
  return res.json();
}

export async function deleteKeyResult(
  strategyId: string,
  objectiveId: string,
  keyResultId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(
    `${BASE}/${strategyId}/objectives/${objectiveId}/key-results/${keyResultId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete key result");
  return res.json();
}

// ─── Milestones ────────────────────────────────────────────

export async function addMilestone(
  strategyId: string,
  data: CreateMilestoneBody,
): Promise<{ milestone: { id: string } }> {
  const res = await fetch(`${BASE}/${strategyId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add milestone");
  return res.json();
}

export async function updateMilestone(
  strategyId: string,
  milestoneId: string,
  data: UpdateMilestoneBody,
): Promise<{ milestone: { id: string } }> {
  const res = await fetch(`${BASE}/${strategyId}/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update milestone");
  return res.json();
}

export async function deleteMilestone(
  strategyId: string,
  milestoneId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/${strategyId}/milestones/${milestoneId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete milestone");
  return res.json();
}

// ─── Focus Areas ───────────────────────────────────────────

export async function addFocusArea(
  strategyId: string,
  data: { name: string; description?: string; icon?: string; color?: string },
): Promise<{ focusArea: { id: string } }> {
  const res = await fetch(`${BASE}/${strategyId}/focus-areas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add focus area");
  return res.json();
}

// ─── Recalculate ───────────────────────────────────────────

export async function recalculateProgress(
  strategyId: string,
): Promise<{ progressPercentage: number }> {
  const res = await fetch(`${BASE}/${strategyId}/recalculate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to recalculate progress");
  return res.json();
}
