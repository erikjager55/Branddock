/**
 * LP-screenshot worker — child-process voor `capturePuckTreeScreenshot`.
 *
 * WAAROM een apart proces: de route-handler draait in Next's server/RSC-laag
 * waar `react` een andere build is dan de copy waar `react-dom/server` zijn
 * dispatcher op zet — `renderToStaticMarkup` is daar onbetrouwbaar. Onder een
 * kale Node/tsx-run bestaat er maar één React-copy en werkt het gewoon;
 * bovendien houdt het proces de Playwright-launch buiten de server-runtime.
 * Zelfde patroon als scripts/dev/render-lp-screenshot.tsx.
 *
 * Aanroep:  tsx scripts/workers/lp-screenshot-worker.tsx <payload.json> <out.png>
 * Payload:  { puckData, ctx, options? } — zie lp-screenshotter.ts
 * Exit 0 + PNG op <out.png> bij succes; exit 1 + stderr-melding bij failure.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { PageRender } from "../../src/lib/landing-pages/page-render";
import type { PageData as Data } from "../../src/lib/landing-pages/page-data";
import { chromium } from "playwright";
import { buildSpikePuckConfig } from "../../src/features/campaigns/components/canvas/medium/puck-config";
import { extractBrandTokensFromContext } from "../../src/lib/landing-pages/brand-tokens";
import { buildA11yStyleBlock } from "../../src/lib/landing-pages/a11y-styles";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

interface WorkerPayload {
  puckData: Data;
  ctx: CanvasContextStack | null;
  options?: {
    viewportWidth?: number;
    viewportHeight?: number;
    fullPage?: boolean;
    maxHeight?: number;
  };
}

const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 800;
const DEFAULT_MAX_HEIGHT = 4500;
const RENDER_TIMEOUT_MS = 15_000;

async function main() {
  const [payloadPath, outPath] = process.argv.slice(2);
  if (!payloadPath || !outPath) {
    throw new Error("usage: lp-screenshot-worker <payload.json> <out.png>");
  }
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8")) as WorkerPayload;
  const { puckData, ctx, options = {} } = payload;

  const config = buildSpikePuckConfig(ctx);
  const body = renderToStaticMarkup(
    React.createElement(PageRender as React.ComponentType<{ config: typeof config; data: Data }>, {
      config,
      data: puckData,
    }),
  );

  // Zelfde token-resolutie als buildSpikePuckConfig: stack-tokens wanneer
  // aanwezig, anders regex-fallback op het flat brand-block.
  const brandTokens = ctx?.brandTokens ?? extractBrandTokensFromContext(ctx?.brand);
  const a11yCss = buildA11yStyleBlock(brandTokens.brand);
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${a11yCss}</style>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${body}</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const viewport = {
      width: options.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH,
      height: options.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT,
    };
    const page = await browser.newPage({ viewport });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: RENDER_TIMEOUT_MS,
    });
    // Geef inline-image-fetches tijd om te laden voordat we schieten
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {
      // Networkidle timeout is OK — page is rendered, gewoon doorgaan
    });

    const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
    const fullPage = options.fullPage !== false;
    let clip: { x: number; y: number; width: number; height: number } | undefined;
    if (fullPage) {
      const scrollHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      if (scrollHeight > maxHeight) {
        clip = { x: 0, y: 0, width: viewport.width, height: maxHeight };
      }
    }
    await page.screenshot({
      type: "png",
      fullPage: fullPage && !clip,
      clip,
      path: outPath,
    });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`[lp-screenshot-worker] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
