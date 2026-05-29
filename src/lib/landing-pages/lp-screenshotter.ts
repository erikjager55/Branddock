/**
 * Landing-page screenshotter (F-VAL dimensie 8 — verbeterplan #6 v2).
 *
 * Render een puckData tree via Puck-config → HTML → Playwright headless
 * → PNG buffer. Vision-judge gebruikt deze om brand-fit te scoren.
 *
 * Pure helper — geen DB, geen route-context. Caller (judgeVisualBrandFit)
 * geeft puckData + brandTokens. Bij Playwright-failure: returnt null
 * (judge fallt graceful terug op skipped status).
 */
import type { CanvasContextStack } from "../ai/canvas-context";
import type { Data } from "@puckeditor/core";

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

const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 800;
const DEFAULT_MAX_HEIGHT = 4500;
const RENDER_TIMEOUT_MS = 15_000;

/**
 * Render een puck-tree naar PNG-buffer via Playwright headless.
 * Returnt null bij failure (Playwright niet beschikbaar, render-crash,
 * timeout) — caller behandelt het als skipped.
 */
export async function capturePuckTreeScreenshot(
  puckData: Data,
  ctx: CanvasContextStack | null,
  options: ScreenshotOptions = {},
): Promise<Buffer | null> {
  // Lazy-import zodat Puck/React niet in andere code-paden laadt + Playwright
  // niet als hard dependency vereist is voor build.
  let renderToStaticMarkup: typeof import("react-dom/server").renderToStaticMarkup;
  let createElement: typeof import("react").createElement;
  let buildSpikePuckConfig: typeof import("@/features/campaigns/components/canvas/medium/puck-config").buildSpikePuckConfig;
  let PuckRender: typeof import("@puckeditor/core").Render;
  try {
    const reactDomServer = await import("react-dom/server");
    renderToStaticMarkup = reactDomServer.renderToStaticMarkup;
    const react = await import("react");
    createElement = react.createElement;
    const puckConfigModule = await import(
      "@/features/campaigns/components/canvas/medium/puck-config"
    );
    buildSpikePuckConfig = puckConfigModule.buildSpikePuckConfig;
    const puckCore = await import("@puckeditor/core");
    PuckRender = puckCore.Render;
  } catch (err) {
    console.warn(
      `[lp-screenshotter] Module imports failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }

  // Bouw Puck-config met brand-tokens uit context. Render het tree naar
  // statische HTML (geen interactivity nodig — judge ziet alleen visueel).
  let bodyHtml: string;
  try {
    const config = buildSpikePuckConfig(ctx);
    // Puck's <Render> is a React-component die config + data props krijgt
    const element = createElement(PuckRender as React.ComponentType<{ config: typeof config; data: Data }>, { config, data: puckData });
    bodyHtml = renderToStaticMarkup(element);
  } catch (err) {
    console.warn(
      `[lp-screenshotter] Puck render failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }

  // Wrap in een complete HTML document met reset + viewport-fit
  const fullHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;

  // Playwright headless — capture screenshot
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (err) {
    console.warn(
      `[lp-screenshotter] Playwright not available: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const viewport = {
      width: options.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH,
      height: options.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT,
    };
    const page = await browser.newPage({ viewport });
    await page.setContent(fullHtml, {
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
    const buffer = await page.screenshot({
      type: "png",
      fullPage: fullPage && !clip,
      clip,
    });
    return buffer;
  } catch (err) {
    console.warn(
      `[lp-screenshotter] Screenshot failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  } finally {
    await browser.close();
  }
}
