/**
 * Landing-page screenshotter (F-VAL dimensie 8 — verbeterplan #6 v2).
 *
 * Render een puckData tree via Puck-config → HTML → Playwright headless
 * → PNG buffer. Vision-judge gebruikt deze om brand-fit te scoren.
 *
 * IMPLEMENTATIE: child-process (`scripts/workers/lp-screenshot-worker.tsx`
 * via tsx). In-process rendert dit NIET — de Next route-handler-laag heeft
 * een andere `react`-build dan waar `react-dom/server` zijn hooks-dispatcher
 * op zet, waardoor Puck's `Render` (useMemo) crasht met "Cannot read
 * properties of null". Een kale Node/tsx-run heeft één React-copy en werkt.
 *
 * Pure helper — geen DB, geen route-context. Caller geeft puckData +
 * brandTokens-context. Bij failure (tsx/Playwright niet beschikbaar,
 * render-crash, timeout): returnt null — caller behandelt het als skipped.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CanvasContextStack } from "../ai/canvas-context";
import type { Data } from "@puckeditor/core";

const execFileAsync = promisify(execFile);

export interface ScreenshotOptions {
  /** Viewport breedte (default 1280 — desktop-class). */
  viewportWidth?: number;
  /** Viewport hoogte (default 800 — hero-shot). */
  viewportHeight?: number;
  /** Full-page of alleen viewport? Default true (judge wil de hele LP zien). */
  fullPage?: boolean;
  /** Max hoogte voor full-page screenshot — voorkomt absurd lange PNG's. */
  maxHeight?: number;
}

/** Hele worker-run: render + browser-launch + screenshot. */
const WORKER_TIMEOUT_MS = 90_000;

/**
 * Render een puck-tree naar PNG-buffer via de screenshot-worker.
 * Returnt null bij failure — caller behandelt het als skipped.
 */
export async function capturePuckTreeScreenshot(
  puckData: Data,
  ctx: CanvasContextStack | null,
  options: ScreenshotOptions = {},
): Promise<Buffer | null> {
  const projectRoot = process.cwd();
  const tsxBin = path.join(projectRoot, "node_modules", ".bin", "tsx");
  const workerPath = path.join(projectRoot, "scripts", "workers", "lp-screenshot-worker.tsx");

  let tmpDir: string | null = null;
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lp-shot-"));
    const payloadPath = path.join(tmpDir, "payload.json");
    const outPath = path.join(tmpDir, "out.png");
    await fs.writeFile(payloadPath, JSON.stringify({ puckData, ctx, options }), "utf8");

    await execFileAsync(tsxBin, [workerPath, payloadPath, outPath], {
      cwd: projectRoot,
      timeout: WORKER_TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
    });

    return await fs.readFile(outPath);
  } catch (err) {
    // execFile-errors dragen stderr van de worker — dat is de echte oorzaak
    const stderr = (err as { stderr?: string })?.stderr?.trim();
    console.warn(
      `[lp-screenshotter] Worker failed: ${stderr || (err instanceof Error ? err.message : String(err))}`,
    );
    return null;
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
