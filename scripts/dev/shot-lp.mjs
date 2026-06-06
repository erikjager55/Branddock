// Dev-tool — screenshot een door render-lp-screenshot.tsx geschreven HTML.
// Run: node scripts/dev/shot-lp.mjs [slug]   (default slug = "zwart")
import { chromium } from "playwright";

const slug = process.argv[2] ?? "zwart";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(`file:///tmp/lp-${slug}.html`, { waitUntil: "networkidle" });
await page.evaluate(async () => { await document.fonts.ready; });
await page.waitForTimeout(600);
await page.screenshot({ path: `/tmp/lp-${slug}-full.png`, fullPage: true });
await page.screenshot({ path: `/tmp/lp-${slug}-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 1000 } });
const h = await page.evaluate(() => document.body.scrollHeight);
console.log(`SHOT ok — /tmp/lp-${slug}-full.png + -hero.png — page height: ${h}px`);
await browser.close();
