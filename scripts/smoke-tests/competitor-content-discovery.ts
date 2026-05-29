/**
 * DB-side smoke voor competitor-content-item-discovery.
 *
 * Test de volledige producer-pipeline + persistence zonder netwerk/Anthropic:
 * een stub-fetchFn levert canned RSS/sitemap/robots-bodies per pad, en
 * stub-classifier-functies vervangen de Haiku-calls. De discoverer-output
 * wordt via applyCompetitorRefreshDualWrite weggeschreven (zelfde TX-pad als
 * de refresh-route) en tegen de DB geassert.
 *
 * 3 fixtures: (1) werkende RSS, (2) sitemap-only (incl. index-recursie),
 * (3) leeg. Plus dedup-re-run (urlHash unique).
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
 *        npx tsx scripts/smoke-tests/competitor-content-discovery.ts
 */
import { ContentFormat, PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { discoverCompetitorContent } from "../../src/lib/competitors/content-discovery/discoverer";
import { applyCompetitorRefreshDualWrite } from "../../src/lib/competitors/refresh-write";
import { computeContentHash } from "../../src/lib/competitors/snapshot-hash";
import type { CanonicalExtracted } from "../../src/lib/competitors/types";
import type { FetchFn } from "../../src/lib/competitors/content-discovery/types";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    fail++;
  }
}

// ─── Stubs ────────────────────────────────────────────────

/** Stub-fetch: matcht een pad-substring → body. Returnt null bij geen match. */
function makeStubFetch(routes: Array<[string, string]>): FetchFn {
  return async (url: string) => {
    for (const [needle, body] of routes) {
      if (url.includes(needle)) return new Response(body, { status: 200 });
    }
    return null;
  };
}

const stubFormats = async (urls: string[]) => {
  const m = new Map<string, ContentFormat>();
  for (const u of urls) {
    if (/\/(blog|article|post)/i.test(u)) m.set(u, ContentFormat.BLOG_POST);
    else if (/\/(news|nieuws|press)/i.test(u)) m.set(u, ContentFormat.PRESS_RELEASE);
    else if (/\/(case|cases|project)/i.test(u)) m.set(u, ContentFormat.CASE_STUDY);
    else m.set(u, ContentFormat.OTHER);
  }
  return m;
};
const stubThemes = async (items: Array<{ url: string }>) =>
  new Map<string, string[]>(items.map((i) => [i.url, ["stub-theme"]]));

// ─── Fixtures ─────────────────────────────────────────────

const RSS_XML = `<?xml version="1.0"?><rss version="2.0"><channel>
${[1, 2, 3].map((n) => `<item><title>Blog ${n}</title><link>https://rss.example/blog/post-${n}</link><pubDate>Mon, 0${n} May 2026 00:00:00 GMT</pubDate><description>Excerpt ${n}</description></item>`).join("")}
${[1, 2, 3].map((n) => `<item><title>News ${n}</title><link>https://rss.example/news/item-${n}</link><pubDate>Mon, 0${n} May 2026 00:00:00 GMT</pubDate><description>News excerpt ${n}</description></item>`).join("")}
</channel></rss>`;

const SITEMAP_INDEX = `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>https://sm.example/sitemap-content.xml</loc></sitemap></sitemapindex>`;

const SITEMAP_URLSET = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[1, 2, 3].map((n) => `<url><loc>https://sm.example/blog/article-${n}</loc><lastmod>2026-05-0${n}</lastmod></url>`).join("")}
${[1, 2].map((n) => `<url><loc>https://sm.example/cases/project-${n}</loc></url>`).join("")}
<url><loc>https://sm.example/about</loc></url>
<url><loc>https://sm.example/contact</loc></url>
</urlset>`;

const BASE_CANONICAL: CanonicalExtracted = {
  tagline: "base", valueProposition: null, targetAudience: null, differentiators: [],
  mainOfferings: [], pricingModel: null, pricingDetails: null, toneOfVoice: null,
  messagingThemes: [], visualStyleNotes: null, strengths: [], weaknesses: [],
  socialLinks: null, hasBlog: true, hasCareersPage: false,
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  const seed = await prisma.competitor.findFirst({ where: { snapshotCount: { gt: 0 } }, select: { workspaceId: true } });
  if (!seed) {
    console.error("Geen backfilled competitor — run backfill eerst.");
    await prisma.$disconnect();
    process.exit(1);
  }
  const workspaceId = seed.workspaceId;
  const stamp = Date.now();

  // Helper: persist een discovery-resultaat via dual-write (snapshot-written pad).
  async function persist(competitorId: string, websiteUrl: string, fetchFn: FetchFn, tagline: string) {
    const existing = await prisma.competitorContentItem.findMany({ where: { competitorId }, select: { urlHash: true } });
    const result = await discoverCompetitorContent({
      websiteUrl, competitorId, workspaceId,
      existingUrlHashes: new Set(existing.map((r) => r.urlHash)),
      fetchFn, classifyFormatsFn: stubFormats, tagThemesFn: stubThemes, budgetMs: 5000,
    });
    const next: CanonicalExtracted = { ...BASE_CANONICAL, tagline };
    await prisma.$transaction((tx) =>
      applyCompetitorRefreshDualWrite(tx as unknown as Prisma.TransactionClient, {
        competitorId, workspaceId,
        workflowBefore: { status: "ANALYZED", tier: "DIRECT" },
        workflowAfter: { status: "ANALYZED", tier: "DIRECT" },
        prevCanonical: { ...BASE_CANONICAL }, nextCanonical: next,
        newContentHash: computeContentHash(next), newScrapeHash: null,
        metadataUpdate: {}, triggerSource: "MANUAL", signalSource: "WEBSCRAPE",
        triggeredById: null, scrapedJsonInfo: undefined,
        precomputedDetected: result.activities, contentItems: result.items,
      }),
    );
    return result;
  }

  const fixtures: string[] = [];
  async function mkCompetitor(slug: string, url: string): Promise<string> {
    const c = await prisma.competitor.create({
      data: { name: `SMOKE ${slug}`, slug: `${slug}-${stamp}`, websiteUrl: url, workspaceId, status: "ANALYZED" },
    });
    fixtures.push(c.id);
    return c.id;
  }

  try {
    // ── Fixture 1: werkende RSS ──
    console.log("\n=== Fixture 1: werkende RSS ===\n");
    {
      const id = await mkCompetitor("rss", "https://rss.example");
      const fetchFn = makeStubFetch([["rss.example/feed", RSS_XML]]); // alleen /feed hit
      const r = await persist(id, "https://rss.example", fetchFn, "rss-1");
      assert("F1 discoverer levert ≥5 items", r.items.length >= 5, `kreeg ${r.items.length}`);
      assert("F1 signalSource RSS", r.items.every((i) => i.signalSource === "RSS"));
      assert("F1 titles + publishedAt gevuld", r.items.every((i) => i.title.length > 0 && i.publishedAt !== null));
      assert("F1 themes getagd", r.items.every((i) => i.themes.length > 0));
      const rows = await prisma.competitorContentItem.findMany({ where: { competitorId: id } });
      assert("F1 rijen gepersisteerd", rows.length === r.items.length && rows.length >= 5);
      assert("F1 firstSeenSnapshotId gezet", rows.every((x) => x.firstSeenSnapshotId !== null));
      const acts = await prisma.competitorActivity.findMany({ where: { competitorId: id } });
      assert("F1 NEW_BLOG_POST + NEW_PRESS_RELEASE activities", acts.some((a) => a.type === "NEW_BLOG_POST") && acts.some((a) => a.type === "NEW_PRESS_RELEASE"));
      assert("F1 activity detectionMethod content-discovery", acts.every((a) => a.detectionMethod === "content-discovery"));
      // dedup re-run
      const r2 = await persist(id, "https://rss.example", fetchFn, "rss-2");
      assert("F1 re-run: 0 nieuwe items (dedup)", r2.items.length === 0);
      assert("F1 nog steeds zelfde aantal rijen", (await prisma.competitorContentItem.count({ where: { competitorId: id } })) === rows.length);
    }

    // ── Fixture 2: sitemap-only (incl. index-recursie) ──
    console.log("\n=== Fixture 2: sitemap-only ===\n");
    {
      const id = await mkCompetitor("sm", "https://sm.example");
      const fetchFn = makeStubFetch([
        ["sm.example/sitemap-content.xml", SITEMAP_URLSET], // child eerst (specifieker)
        ["sm.example/sitemap.xml", SITEMAP_INDEX],
      ]);
      const r = await persist(id, "https://sm.example", fetchFn, "sm-1");
      assert("F2 discoverer levert ≥5 items (via index-recursie)", r.items.length >= 5, `kreeg ${r.items.length}`);
      assert("F2 signalSource WEBSCRAPE", r.items.every((i) => i.signalSource === "WEBSCRAPE"));
      assert("F2 non-content (/about,/contact) gefilterd", r.items.every((i) => !/\/(about|contact)/.test(i.url)));
      assert("F2 CASE_STUDY + BLOG_POST formats", r.items.some((i) => i.format === "CASE_STUDY") && r.items.some((i) => i.format === "BLOG_POST"));
      const acts = await prisma.competitorActivity.findMany({ where: { competitorId: id } });
      assert("F2 NEW_CASE_STUDY activity", acts.some((a) => a.type === "NEW_CASE_STUDY"));
    }

    // ── Fixture 3: leeg ──
    console.log("\n=== Fixture 3: leeg (geen feed, geen sitemap) ===\n");
    {
      const id = await mkCompetitor("empty", "https://empty.example");
      const fetchFn = makeStubFetch([]); // alles → null
      const r = await persist(id, "https://empty.example", fetchFn, "empty-1");
      assert("F3 0 items", r.items.length === 0);
      assert("F3 0 activities", r.activities.length === 0);
      assert("F3 0 rijen in DB", (await prisma.competitorContentItem.count({ where: { competitorId: id } })) === 0);
    }
  } finally {
    console.log("\n=== Cleanup ===\n");
    for (const id of fixtures) {
      await prisma.competitor.delete({ where: { id } }).catch((e) => console.warn("cleanup:", e));
    }
  }

  console.log(`\n${"=".repeat(44)}\n${pass} PASS / ${fail} FAIL\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Smoke crashed:", err);
  process.exit(1);
});
