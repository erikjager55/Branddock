/**
 * Library-first slot-matcher (tasks/lp-library-first-matching; ADR
 * 2026-06-10-feature-visual-pipeline beslissing 10).
 *
 * Matcht LP feature-slots semantisch tegen échte merkfoto's in de Media
 * Library (tekst-query vs aiDescription-pgvector via findSimilarMediaAssets)
 * vóórdat er iets gegenereerd wordt. Greedy unieke toewijzing (één asset →
 * max één slot = gratis set-diversiteit op het bronpad), foto-categorieën
 * only, PHOTO_REAL-boost, en een disk-existence-guard tegen orphaned
 * DB-records (320/522 assets wijzen naar verwijderde files). Cold-start
 * (geen embeddings) degradeert naar all-uncovered zonder throw.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { findSimilarMediaAssets, type SimilarMediaAsset, type FindSimilarOptions } from "@/lib/media/embedding-search";

/** Categorieën die nooit als feature-foto mogen matchen. */
export const EXCLUDED_MATCH_CATEGORIES = [
  "LOGO",
  "BRAND_MARK",
  "ICON",
  "ILLUSTRATION",
  "INFOGRAPHIC",
  "PRESENTATION",
];

/**
 * Conservatieve drempel: een "echt maar fout" merkbeeld is schadelijker dan
 * een goed AI-beeld (jury source-first lens). Tuning via de golden-set
 * dry-run; de route legt er bovendien een coherence-judge overheen.
 */
export const LIBRARY_MATCH_THRESHOLD = 0.55;

/** Kleine voorrang voor echte foto's boven AI-gegenereerde library-assets. */
const PHOTO_REAL_BOOST = 0.05;

export interface MatchSlotInput {
  index: number;
  /** Semantische query — brief.subject of heading+body. */
  query: string;
}

export interface SlotMatch {
  index: number;
  assetId: string;
  fileUrl: string;
  similarity: number;
  category: string | null;
}

export interface LibraryMatchResult {
  /** Per slot-index de toegewezen asset (alleen gedekte slots). */
  assignments: Map<number, SlotMatch>;
  /** Slot-indices zonder match → AI-generatie-pad. */
  uncovered: number[];
  /** Mens-leesbare redenen (cold-start, drempel, orphans) voor telemetrie/dry-run. */
  diagnostics: string[];
}

export interface MatchLibraryOptions {
  threshold?: number;
  /** Injecteerbaar voor unit-smokes. */
  search?: (workspaceId: string, queryText: string, options?: FindSimilarOptions) => Promise<SimilarMediaAsset[]>;
  /** Injecteerbaar voor unit-smokes; default: disk-check voor lokale /uploads. */
  fileExists?: (fileUrl: string) => boolean;
}

function defaultFileExists(fileUrl: string): boolean {
  // Orphaned-records-guard: lokale uploads moeten op disk bestaan; remote
  // URLs (R2/CDN) kunnen we hier niet goedkoop checken → doorlaten.
  if (!fileUrl.startsWith("/")) return true;
  try {
    return existsSync(resolve(process.cwd(), "public" + fileUrl));
  } catch {
    return false;
  }
}

/**
 * Match feature-slots tegen de Media Library. Pure orchestratie — alle I/O
 * loopt via de injecteerbare `search`/`fileExists` zodat de beslislogica
 * unit-smokebaar is.
 */
export async function matchLibraryImagesToSlots(
  workspaceId: string,
  slots: MatchSlotInput[],
  opts: MatchLibraryOptions = {},
): Promise<LibraryMatchResult> {
  const threshold = opts.threshold ?? LIBRARY_MATCH_THRESHOLD;
  const search = opts.search ?? findSimilarMediaAssets;
  const fileExists = opts.fileExists ?? defaultFileExists;
  const diagnostics: string[] = [];

  type Candidate = { slotIndex: number; asset: SimilarMediaAsset; score: number };
  const candidates: Candidate[] = [];

  for (const slot of slots) {
    const query = slot.query.trim();
    if (query.length < 8) {
      diagnostics.push(`slot ${slot.index}: query te kort voor matching`);
      continue;
    }
    try {
      const results = await search(workspaceId, query, {
        threshold,
        limit: 8,
        excludeCategories: EXCLUDED_MATCH_CATEGORIES,
      });
      let orphans = 0;
      for (const asset of results) {
        if (!fileExists(asset.fileUrl)) {
          orphans++;
          continue;
        }
        const boost = asset.aiTags.includes("auth:PHOTO_REAL") ? PHOTO_REAL_BOOST : 0;
        candidates.push({ slotIndex: slot.index, asset, score: asset.similarity + boost });
      }
      if (orphans > 0) diagnostics.push(`slot ${slot.index}: ${orphans} orphaned asset(s) overgeslagen`);
      if (results.length === 0) diagnostics.push(`slot ${slot.index}: geen kandidaten ≥ ${threshold}`);
    } catch (err) {
      // Cold-start / geen OPENAI_API_KEY / pgvector-fout → slot blijft AI-pad.
      diagnostics.push(`slot ${slot.index}: matching faalde (${err instanceof Error ? err.message : "onbekend"})`);
    }
  }

  // Greedy unieke toewijzing op aflopende (geboostte) score: het sterkste
  // (slot, asset)-paar wint; een asset kan maar één slot dekken.
  candidates.sort((a, b) => b.score - a.score);
  const assignments = new Map<number, SlotMatch>();
  const usedAssets = new Set<string>();
  for (const c of candidates) {
    if (assignments.has(c.slotIndex) || usedAssets.has(c.asset.id)) continue;
    assignments.set(c.slotIndex, {
      index: c.slotIndex,
      assetId: c.asset.id,
      fileUrl: c.asset.fileUrl,
      similarity: c.asset.similarity,
      category: c.asset.category,
    });
    usedAssets.add(c.asset.id);
  }

  const uncovered = slots.map((s) => s.index).filter((i) => !assignments.has(i));
  return { assignments, uncovered, diagnostics };
}
