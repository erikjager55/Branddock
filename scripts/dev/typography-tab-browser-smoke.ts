/**
 * Browser-smoke voor de Brandstyle → Typography-tab
 * (deferred-browser-smokes-unblocked; checklist F4 stap 13 uit
 * `tasks/done/brandstyle-typography-fonts.md`).
 *
 * Waarom een BROWSER-smoke en niet de bestaande pure smokes: de fix van
 * 2026-06-05 ging over een *rendering*-divergentie. Type Scale en In Context
 * berekenden dezelfde kop verschillend — dezelfde familie, maar een andere
 * weight (Type Scale `row.weight || 'inherit'` → 400, In Context
 * `h1?.weight || 700` → bold) zodra de scrape geen weights opleverde. Beide
 * paden zijn nu `weightForLevel()`, maar dat een gedeelde helper *bestaat*
 * bewijst niet dat beide secties hem ook echt gebruiken in de gerenderde DOM.
 * Alleen `getComputedStyle` in een echte browser bewijst dat.
 *
 * Assertie-kern: voor h1/h2/h3 moeten font-family én font-weight identiek zijn
 * tussen de Type-Scale-rij en de In-Context-kop. Sizes mogen wél verschillen —
 * In Context is een genormaliseerde mock (bewuste keuze, zie task-file).
 *
 * Draait tegen de LOKALE dev-server en LEEST alleen — geen mutaties, geen seed.
 *
 * Run (dev-server op 3000 moet draaien):
 *   npx tsx scripts/dev/typography-tab-browser-smoke.ts
 * Env: SMOKE_BASE (default http://localhost:3000)
 *      SMOKE_EMAIL / SMOKE_PASSWORD (default lokale smoke-account)
 *      SMOKE_WORKSPACE_ID (default "Branddock Demo")
 *      SMOKE_SHOTS (map voor screenshots, default ./smoke-shots)
 *
 * ⚠ De workspace moet BEREIKBAAR zijn voor SMOKE_EMAIL. `branddock-workspace-id`
 * is geen vrije keuze: `getExplicitWorkspace` doet een volledige ACL-check en
 * valt bij een niet-toegestane id stil terug op de eerste workspace waar het
 * account wél bij mag (de IDOR-fix van 2026-07-22). Het smoke-account
 * sarah@branddock.com is `workspaceScoped` met precies één workspace. Zonder de
 * assertie hieronder test je dan ongemerkt een ándere workspace dan bedoeld —
 * dat gebeurde bij het schrijven van deze smoke, en twee "verschillende" runs
 * gaven pixel-identieke screenshots.
 */

import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'sarah@branddock.com';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Password123!';
const WORKSPACE_ID = process.env.SMOKE_WORKSPACE_ID ?? 'demo-workspace-branddock-001';
const SHOTS = process.env.SMOKE_SHOTS ?? join(process.cwd(), 'smoke-shots');

let pass = 0;
const failures: string[] = [];

function ok(label: string, cond: boolean): void {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
  if (cond) pass++;
  else failures.push(label);
}

async function signIn(ctx: BrowserContext): Promise<void> {
  const login = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, {
    headers: { origin: BASE },
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!login.ok()) throw new Error(`Login faalde: ${login.status()}`);

  const orgs = (await (await ctx.request.get(`${BASE}/api/auth/organization/list`)).json()) as Array<{
    id: string;
  }>;
  if (!orgs[0]?.id) throw new Error('Geen organizations voor dit account');
  const setActive = await ctx.request.post(`${BASE}/api/auth/organization/set-active`, {
    headers: { origin: BASE },
    data: { organizationId: orgs[0].id },
  });
  if (!setActive.ok()) throw new Error(`set-active faalde: ${setActive.status()}`);

  await ctx.addCookies([{ name: 'branddock-workspace-id', value: WORKSPACE_ID, url: BASE }]);
}

async function openTypographyTab(page: Page): Promise<void> {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-section-id]').first().waitFor({ state: 'visible', timeout: 45_000 });

  // Onboarding-wizard kan de sidebar-klik blokkeren.
  const wizard = page.locator('[data-testid="onboarding-wizard"]');
  if (await wizard.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const skip = page.locator('[data-testid="onboarding-wizard"] button', {
      hasText: /skip|get started|close/i,
    });
    await skip.first().click({ timeout: 5_000 }).catch(() => {});
    await wizard.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  await page.locator('[data-section-id="brandstyle"]').first().click();
  await page.locator('[data-testid="styleguide-tabs"]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('[data-testid="tab-typography"]').click();
  await page.locator('[data-testid="typography-section"]').waitFor({ state: 'visible', timeout: 30_000 });

  // Webfonts moeten geladen zijn vóór we computed styles lezen — anders meet je
  // de fallback en niet de merkfont.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(750);
}

/** Genormaliseerde eerste familie uit een computed font-family-stack. */
function firstFamily(stack: string): string {
  return (stack.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase();
}

async function main(): Promise<void> {
  console.log('Typography-tab browser-smoke (Brandstyle → Typography)');
  console.log(`  base=${BASE} workspace=${WORKSPACE_ID} user=${EMAIL}`);
  mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 1000 } });

  try {
    await signIn(ctx);

    // Bewijs dat we meten wat we denken te meten. Zie de ⚠ in de kop.
    const probe = await ctx.request.get(`${BASE}/api/brandstyle`);
    const probeBody = (await probe.json()) as { styleguide?: { workspaceId?: string }; workspaceId?: string };
    const resolvedWs = probeBody.styleguide?.workspaceId ?? probeBody.workspaceId ?? '(onbekend)';
    if (resolvedWs !== WORKSPACE_ID) {
      throw new Error(
        `De app resolvet naar workspace ${resolvedWs}, niet naar de gevraagde ${WORKSPACE_ID}. ` +
          `Waarschijnlijk heeft ${EMAIL} geen toegang tot die workspace (workspaceScoped-ACL). ` +
          `Gebruik een account met toegang, of zet SMOKE_WORKSPACE_ID op een bereikbare workspace.`,
      );
    }
    ok(`workspace-identiteit bevestigd (${resolvedWs})`, true);

    const page = await ctx.newPage();
    await openTypographyTab(page);

    const section = page.locator('[data-testid="typography-section"]');
    ok('Typography-tab rendert', await section.isVisible());

    await section.screenshot({ path: join(SHOTS, 'typography-tab-full.png') });
    console.log(`  · screenshot: ${join(SHOTS, 'typography-tab-full.png')}`);

    // ── Brand Fonts — first-family canonicalisatie (D2) ─────
    // De extractor pakte ooit blind `split(",")[0]` van een stack en koos
    // daarmee `effra-fallback` als heading-familie. De getoonde naam moet dus
    // één schone familienaam zijn: geen stack-restant (komma), geen
    // `-fallback`-variant, en geen kale CSS-generic.
    const fontNames = section.locator('div.text-2xl.font-semibold');
    const nameCount = await fontNames.count();
    if (nameCount === 0) {
      console.log('  · geen gedetecteerde merkfonts in deze workspace — D2-checks overgeslagen');
    }
    for (let i = 0; i < nameCount; i++) {
      const raw = (await fontNames.nth(i).innerText()).trim();
      if (!raw) continue;
      const lower = raw.toLowerCase();
      ok(
        `D2 "${raw}": één familie, geen stack-restant`,
        !raw.includes(','),
      );
      ok(
        `D2 "${raw}": geen -fallback-variant gekozen`,
        !/-fallback\b/.test(lower),
      );
      ok(
        `D2 "${raw}": geen kale CSS-generic`,
        !['sans-serif', 'serif', 'monospace', 'cursive', 'system-ui'].includes(lower),
      );
    }

    // ── Type Scale ──────────────────────────────────────────
    // De rij-structuur is: [LEVEL-label] [sample-tekst] [meta]. We zoeken de
    // rij via zijn level-label en lezen de sample-span ernaast.
    const scaleRows = section.locator('div.flex.items-baseline');
    const rowCount = await scaleRows.count();

    // Niet elke workspace heeft een type-scale (In Context rendert alleen bij
    // `typeScale.length > 0`). Dat is een data-conditie, geen defect — anders
    // kleurt een merk zónder scale deze smoke onterecht rood.
    const hasScale = rowCount > 0;
    if (!hasScale) {
      console.log('  · geen type-scale in deze workspace — Type Scale/In Context overgeslagen');
    } else {
      ok(`Type Scale bevat rijen (${rowCount})`, true);
    }

    if (hasScale) {
      const scaleStyles = new Map<string, { family: string; weight: string }>();
      for (let i = 0; i < rowCount; i++) {
        const row = scaleRows.nth(i);
        const level = (await row.locator('span.font-mono').first().innerText().catch(() => ''))
          .trim()
          .toLowerCase();
        if (!level) continue;
        const sample = row.locator('span.flex-1').first();
        if ((await sample.count()) === 0) continue;
        const style = await sample.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { family: cs.fontFamily, weight: cs.fontWeight };
        });
        scaleStyles.set(level, { family: firstFamily(style.family), weight: style.weight });
      }
      ok(`Type-Scale-niveaus uitgelezen (${[...scaleStyles.keys()].join(', ')})`, scaleStyles.size > 0);

      // ── In Context ──────────────────────────────────────────
      const inContext = section.locator('div.rounded-md.border').filter({ has: page.locator('h1') }).last();
      ok('In-Context-preview aanwezig', (await inContext.count()) > 0);

      await inContext.screenshot({ path: join(SHOTS, 'typography-in-context.png') });
      console.log(`  · screenshot: ${join(SHOTS, 'typography-in-context.png')}`);

      // ── De kern-assertie ────────────────────────────────────
      // Dit is precies de divergentie die op 2026-06-05 gefixt is.
      for (const level of ['h1', 'h2', 'h3'] as const) {
        const scale = scaleStyles.get(level);
        if (!scale) {
          console.log(`  · ${level} niet in de type-scale van deze workspace — overgeslagen`);
          continue;
        }
        const el = inContext.locator(level).first();
        if ((await el.count()) === 0) {
          ok(`${level}: In-Context-element aanwezig`, false);
          continue;
        }
        const ctxStyle = await el.evaluate((node) => {
          const cs = getComputedStyle(node);
          return { family: cs.fontFamily, weight: cs.fontWeight };
        });
        const ctxFamily = firstFamily(ctxStyle.family);

        ok(
          `${level}: font-family gelijk in Type Scale en In Context (${scale.family} = ${ctxFamily})`,
          scale.family === ctxFamily,
        );
        ok(
          `${level}: font-weight gelijk in Type Scale en In Context (${scale.weight} = ${ctxStyle.weight})`,
          scale.weight === ctxStyle.weight,
        );
      }

      // Kop moet zwaarder zijn dan body — de 400-vs-700-bug maakte de kop in
      // Type Scale regular terwijl In Context bold toonde.
      const h1Weight = Number(scaleStyles.get('h1')?.weight ?? '0');
      ok(`h1 in Type Scale is een kop-gewicht, niet 400 (${h1Weight})`, h1Weight >= 600);
    }

    // D5/D4: geen 404-Google-Fonts-link voor een niet-bestaande familie. De
    // oude TypographySection injecteerde die blind.
    const badLinks = await page.evaluate(() =>
      [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].map((l) =>
        (l as HTMLLinkElement).href,
      ),
    );
    console.log(`  · Google-Fonts-links op de pagina: ${badLinks.length}`);
  } catch (err) {
    failures.push(`onverwachte fout: ${(err as Error).message}`);
    console.error(`  ✗ ${(err as Error).message}`);
  } finally {
    await ctx.close();
    await browser.close();
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (failures.length > 0) {
    console.error(`✗ ${failures.length} gefaald, ${pass} geslaagd\n`);
    for (const f of failures) console.error(`   · ${f}`);
    process.exit(1);
  }
  console.log(`✓ alle ${pass} checks geslaagd — screenshots in ${SHOTS}`);
}

void main();
