import type {
  GoldenCircleData,
  GoldenCircleVersion,
} from "../types/golden-circle.types";

export async function fetchGoldenCircle(
  assetId: string,
): Promise<GoldenCircleData> {
  const res = await fetch(`/api/brand-assets/${assetId}/golden-circle`);
  if (!res.ok) throw new Error("Failed to fetch golden circle");
  return res.json();
}

export async function updateGoldenCircle(
  assetId: string,
  data: {
    why?: { statement: string; details: string };
    how?: { statement: string; details: string };
    what?: { statement: string; details: string };
  },
): Promise<{ success: boolean; updatedAt: string }> {
  const res = await fetch(`/api/brand-assets/${assetId}/golden-circle`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update golden circle");
  return res.json();
}

export async function toggleGoldenCircleLock(
  assetId: string,
  locked: boolean,
): Promise<{ isLocked: boolean; lockedAt: string | null }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/golden-circle/lock`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked }),
    },
  );
  if (!res.ok) throw new Error("Failed to toggle lock");
  return res.json();
}

export async function fetchGoldenCircleHistory(
  assetId: string,
): Promise<{ versions: GoldenCircleVersion[] }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/golden-circle/history`,
  );
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
