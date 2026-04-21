// =============================================================
// Page Screenshotter — Sprint 5A
//
// Captures 2 PNG screenshots of a URL via Playwright:
//   1. Viewport-sized hero shot (above the fold) — ~1280x800
//   2. Full-page shot, truncated at 3000px height
//
// The buffers are passed directly into the Visual Identity / Voice /
// Imagery AI calls as image blocks so Claude can SEE the page alongside
// the extracted CSS data. Dramatically improves accuracy of primary/
// secondary/accent color classification, font role mapping, imagery
// style detection, and brand personality inference.
//
// Gated by env var `BRANDSTYLE_VISUAL_AI=1`. Requires Chromium binary.
// =============================================================

export function isVisualAiEnabled(): boolean {
  return process.env.BRANDSTYLE_VISUAL_AI === "1";
}

/** Max height of the full-page screenshot we send to Claude. Above this,
 *  the token cost grows without adding much brand signal (footer + dead space). */
const MAX_FULL_PAGE_HEIGHT = 3000;
const VIEWPORT = { width: 1280, height: 800 };
const NAV_TIMEOUT_MS = 30_000;

/** One captured screenshot ready to be sent to Claude. */
export interface PageScreenshot {
  label: "hero" | "full-page";
  buffer: Buffer;
  mediaType: "image/png";
}

/**
 * Open the URL in headless Chromium and capture the hero + full-page
 * screenshots. Returns an empty array on failure (non-critical — the
 * analyzer should still complete using the CSS-only prompt path).
 */
export async function capturePageScreenshots(url: string): Promise<PageScreenshot[]> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (err) {
    console.warn(
      `[page-screenshotter] Playwright not available: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: VIEWPORT,
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });

    // Hero / above-the-fold — just the current viewport
    const hero = await page.screenshot({ type: "png", fullPage: false });

    // Full page, clipped to MAX_FULL_PAGE_HEIGHT so we don't send 8000px
    // of footer-empty-space to Claude. We read the page's actual scroll
    // height and clip only when needed.
    const scrollHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const fullPage = await page.screenshot({
      type: "png",
      fullPage: scrollHeight <= MAX_FULL_PAGE_HEIGHT,
      clip:
        scrollHeight > MAX_FULL_PAGE_HEIGHT
          ? { x: 0, y: 0, width: VIEWPORT.width, height: MAX_FULL_PAGE_HEIGHT }
          : undefined,
    });

    return [
      { label: "hero", buffer: hero, mediaType: "image/png" },
      { label: "full-page", buffer: fullPage, mediaType: "image/png" },
    ];
  } catch (err) {
    console.warn(
      `[page-screenshotter] Capture failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  } finally {
    await browser.close();
  }
}
