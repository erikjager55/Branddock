import { prisma } from "@/lib/prisma";
import { SCAN_STEPS } from "./scan-steps";

// =============================================================
// Scan orchestrator — simulates 8-step progressive scan
// Later: replace with real AI cross-module analysis
// =============================================================

const STEP_DELAY_MS = 2000; // 2 seconds per step

// In-memory scan progress tracking (per scanId)
const scanProgress = new Map<
  string,
  {
    currentStep: number;
    completedSteps: string[];
    progress: number;
    cancelled: boolean;
  }
>();

export function getScanProgress(scanId: string) {
  return scanProgress.get(scanId) ?? null;
}

export function cancelScan(scanId: string): boolean {
  const progress = scanProgress.get(scanId);
  if (progress) {
    progress.cancelled = true;
    return true;
  }
  return false;
}

/**
 * Run an 8-step simulated scan. Updates progress in-memory,
 * then writes final results to the database.
 */
export async function runScan(scanId: string, workspaceId: string) {
  // Initialize progress
  scanProgress.set(scanId, {
    currentStep: 0,
    completedSteps: [],
    progress: 0,
    cancelled: false,
  });

  // Simulate each step
  for (let i = 0; i < SCAN_STEPS.length; i++) {
    const state = scanProgress.get(scanId);
    if (!state || state.cancelled) {
      // Mark cancelled in DB
      await prisma.alignmentScan.update({
        where: { id: scanId },
        data: { status: "CANCELLED" },
      });
      scanProgress.delete(scanId);
      return;
    }

    state.currentStep = i;
    state.progress = Math.round(((i + 1) / SCAN_STEPS.length) * 100);

    // Wait for step delay
    await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));

    state.completedSteps.push(SCAN_STEPS[i]);
  }

  // Check if cancelled during last step
  const finalState = scanProgress.get(scanId);
  if (!finalState || finalState.cancelled) {
    await prisma.alignmentScan.update({
      where: { id: scanId },
      data: { status: "CANCELLED" },
    });
    scanProgress.delete(scanId);
    return;
  }

  // Generate demo results with slight randomization
  const moduleData = generateModuleScores();
  const totalItems = moduleData.reduce(
    (sum, m) => sum + m.alignedCount + m.reviewCount + m.misalignedCount,
    0
  );
  const alignedCount = moduleData.reduce((sum, m) => sum + m.alignedCount, 0);
  const reviewCount = moduleData.reduce((sum, m) => sum + m.reviewCount, 0);
  const misalignedCount = moduleData.reduce(
    (sum, m) => sum + m.misalignedCount,
    0
  );
  const overallScore = Math.round(
    moduleData.reduce((sum, m) => sum + m.score, 0) / moduleData.length
  );

  const issues = generateIssues(workspaceId);

  // Write results to database
  const now = new Date();
  await prisma.alignmentScan.update({
    where: { id: scanId },
    data: {
      score: overallScore,
      totalItems,
      alignedCount,
      reviewCount,
      misalignedCount,
      status: "COMPLETED",
      completedAt: now,
      moduleScores: {
        create: moduleData.map((m) => ({
          ...m,
          lastCheckedAt: now,
        })),
      },
      issues: {
        create: issues,
      },
    },
  });

  // Cleanup in-memory state after a delay
  setTimeout(() => scanProgress.delete(scanId), 60_000);
}

// ─── Demo data generators ─────────────────────────────────────

function randomInRange(base: number, variance: number): number {
  return Math.max(
    0,
    Math.min(100, base + Math.floor((Math.random() - 0.5) * 2 * variance))
  );
}

function generateModuleScores() {
  return [
    {
      moduleName: "BRAND_FOUNDATION" as const,
      score: randomInRange(82, 8),
      alignedCount: 4 + Math.floor(Math.random() * 3),
      reviewCount: Math.floor(Math.random() * 3),
      misalignedCount: Math.floor(Math.random() * 2),
    },
    {
      moduleName: "BUSINESS_STRATEGY" as const,
      score: randomInRange(85, 6),
      alignedCount: 3 + Math.floor(Math.random() * 2),
      reviewCount: Math.floor(Math.random() * 2),
      misalignedCount: Math.floor(Math.random() * 1),
    },
    {
      moduleName: "BRANDSTYLE" as const,
      score: randomInRange(95, 5),
      alignedCount: 5 + Math.floor(Math.random() * 2),
      reviewCount: Math.floor(Math.random() * 1),
      misalignedCount: 0,
    },
    {
      moduleName: "PERSONAS" as const,
      score: randomInRange(68, 10),
      alignedCount: 2 + Math.floor(Math.random() * 2),
      reviewCount: Math.floor(Math.random() * 2),
      misalignedCount: Math.floor(Math.random() * 2),
    },
    {
      moduleName: "PRODUCTS_SERVICES" as const,
      score: randomInRange(72, 8),
      alignedCount: 2 + Math.floor(Math.random() * 2),
      reviewCount: Math.floor(Math.random() * 2),
      misalignedCount: Math.floor(Math.random() * 2),
    },
    {
      moduleName: "MARKET_INSIGHTS" as const,
      score: randomInRange(90, 5),
      alignedCount: 5 + Math.floor(Math.random() * 2),
      reviewCount: Math.floor(Math.random() * 2),
      misalignedCount: 0,
    },
  ];
}

function generateIssues(workspaceId: string) {
  const pool = [
    {
      severity: "CRITICAL" as const,
      title: "Persona 'Tech-Savvy Millennial' contradicts Brand Positioning",
      modulePath: "Personas \u2192 Tech-Savvy Millennial",
      description:
        "The persona targets a millennial audience with casual communication preferences, but your brand positioning emphasizes enterprise decision-makers with formal, authoritative messaging.",
      conflictsWith: [
        "Brand Foundation (Positioning)",
        "Business Strategy",
      ],
      recommendation:
        "Consider adjusting the persona to target enterprise decision-makers, or broaden your brand positioning to include multiple market segments.",
      sourceItemType: "Persona",
      targetItemType: "BrandAsset",
    },
    {
      severity: "WARNING" as const,
      title: "Product tone doesn't match Brandstyle guidelines",
      modulePath: "Products & Services \u2192 Mobile App Framework",
      description:
        "The product description uses casual, informal language ('super easy', 'awesome features') that conflicts with the brand style guide's professional tone of voice.",
      conflictsWith: ["Brandstyle (Tone of Voice)"],
      recommendation:
        "Rewrite the product description to use professional and authoritative language consistent with your brand style guide.",
      sourceItemType: "Product",
      targetItemType: "Brandstyle",
    },
    {
      severity: "WARNING" as const,
      title: "Business Strategy growth targets conflict with market positioning",
      modulePath: "Business Strategy \u2192 Growth Objectives",
      description:
        "The strategy targets 200% growth in the SMB segment, but your brand is positioned as a premium enterprise solution. This creates a market segment mismatch.",
      conflictsWith: ["Brand Foundation (Market Position)"],
      recommendation:
        "Align growth targets with your current premium enterprise positioning, or update positioning to reflect broader market ambitions.",
      sourceItemType: "BusinessStrategy",
      targetItemType: "BrandAsset",
    },
    {
      severity: "SUGGESTION" as const,
      title:
        "Brand Foundation values could be reflected in Product descriptions",
      modulePath: "Brand Foundation \u2192 Core Values",
      description:
        "Your core brand values (sustainability, innovation, transparency) are not consistently reflected in product descriptions and marketing materials.",
      conflictsWith: ["Products & Services"],
      recommendation:
        "Add sustainability messaging to product descriptions to reinforce core brand values across all touchpoints.",
      sourceItemType: "BrandAsset",
      targetItemType: "Product",
    },
  ];

  // Pick 3-4 issues randomly
  const count = 3 + Math.floor(Math.random() * 2);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((issue) => ({
    ...issue,
    status: "OPEN" as const,
    workspaceId,
  }));
}
