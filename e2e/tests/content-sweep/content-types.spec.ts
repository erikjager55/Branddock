import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth.fixture';
import { DELIVERABLE_TYPES } from '../../../src/features/campaigns/lib/deliverable-types';
import {
  getRequiredInputs,
  type ContentTypeInputField,
} from '../../../src/features/campaigns/lib/content-type-inputs';

/**
 * Sweep over de ZICHTBARE content-types: het echte klikpad
 * Quick Content → aanmaken → Canvas → verplichte velden → genereren → varianten.
 *
 * Draait tegen de ge-importeerde Napking-workspace in `branddock_test`.
 * Elk type legt een uitkomst vast in `content-sweep-outcomes.json`, óók bij
 * falen — een sweep die halverwege stopt is waardeloos als inventarisatie.
 *
 * Alles behalve VARIANTS_READY faalt de test. Een vroege `return` op een
 * geblokkeerd type zou als "passed" rapporteren terwijl er niets gegenereerd is.
 */

const WORKSPACE_ID = 'e2e-ws-napking-001';
const CAMPAIGN_ID = 'e2e-campaign-napking-001';

const VISIBLE_TYPES = DELIVERABLE_TYPES.filter((t) => !t.hidden);

const OUTCOMES_FILE = path.resolve(__dirname, '../../../content-sweep-outcomes.json');

type Result =
  | 'VARIANTS_READY'
  | 'EMPTY'
  | 'BLOCKED_REQUIRED_FIELDS'
  | 'GENERATION_FAILED'
  | 'FIELD_UI_MISSING'
  | 'NO_GENERATE_BUTTON'
  | 'TIMEOUT'
  | 'ERROR';

interface Outcome {
  typeId: string;
  name: string;
  category: string;
  requiredFields: string[];
  filledFields: string[];
  created: boolean;
  generateClicked: boolean;
  result: Result;
  detail: string;
  elapsedMs: number;
}

function record(outcome: Outcome): void {
  let all: Outcome[] = [];
  if (fs.existsSync(OUTCOMES_FILE)) {
    try {
      all = JSON.parse(fs.readFileSync(OUTCOMES_FILE, 'utf8')) as Outcome[];
    } catch {
      all = [];
    }
  }
  all = all.filter((o) => o.typeId !== outcome.typeId);
  all.push(outcome);
  fs.writeFileSync(OUTCOMES_FILE, JSON.stringify(all, null, 2));
}

/** Vult één verplicht type-invoerveld. Geeft false als het veld niet rendert. */
async function fillRequiredField(page: Page, field: ContentTypeInputField): Promise<boolean> {
  const container = page.getByTestId(`cti-${field.key}`);
  if (!(await container.isVisible({ timeout: 5_000 }).catch(() => false))) return false;

  switch (field.type) {
    case 'select':
    case 'product-select': {
      const select = container.locator('select').first();
      if (!(await select.isVisible().catch(() => false))) return false;
      const values = await select
        .locator('option')
        .evaluateAll((opts) =>
          (opts as HTMLOptionElement[]).map((o) => o.value).filter((v) => v.length > 0),
        );
      if (values.length === 0) return false;
      await select.selectOption(values[0]);
      return true;
    }
    case 'tags': {
      const input = container.locator('input').first();
      if (!(await input.isVisible().catch(() => false))) return false;
      await input.fill('napking');
      await input.press('Enter');
      return true;
    }
    case 'textarea': {
      const ta = container.locator('textarea').first();
      if (!(await ta.isVisible().catch(() => false))) return false;
      await ta.fill(`Testinvoer voor ${field.label}.`);
      return true;
    }
    case 'number': {
      const input = container.locator('input').first();
      if (!(await input.isVisible().catch(() => false))) return false;
      await input.fill('3');
      return true;
    }
    default: {
      const input = container.locator('input, textarea').first();
      if (!(await input.isVisible().catch(() => false))) return false;
      await input.fill(`Test ${field.label}`);
      return true;
    }
  }
}

for (const type of VISIBLE_TYPES) {
  test(`content-type: ${type.id}`, async ({ authenticatedPage: page }) => {
    const started = Date.now();
    const required = getRequiredInputs(type.id);
    const outcome: Outcome = {
      typeId: type.id,
      name: type.name,
      category: type.category,
      requiredFields: required.map((f) => f.key),
      filledFields: [],
      created: false,
      generateClicked: false,
      result: 'ERROR',
      detail: '',
      elapsedMs: 0,
    };

    try {
      // ── Workspace scherpstellen op de Napking-kopie ─────────────
      const switched = await page.request.post('/api/workspace/switch', {
        data: { workspaceId: WORKSPACE_ID },
      });
      expect(switched.ok(), 'workspace switch moet slagen').toBeTruthy();
      await page.reload();
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30_000 });

      // ── Quick Content: type + campagne + doel ───────────────────
      await page.getByTestId('topnav-quick-content').click();
      const typeSelect = page.getByTestId('quick-content-type');
      await expect(typeSelect).toBeVisible({ timeout: 15_000 });
      await typeSelect.selectOption(type.id);
      await page.getByTestId('quick-content-campaign').selectOption(CAMPAIGN_ID);
      await page
        .getByTestId('quick-content-objective')
        .fill(`Testdoel voor ${type.name}: leg helder uit wat Napking doet en voor wie.`);
      await page.getByTestId('quick-content-submit').click();
      outcome.created = true;

      // ── Canvas: verplichte type-velden vullen ───────────────────
      const generateBtn = page.getByTestId('canvas-generate');
      const appeared = await generateBtn
        .waitFor({ state: 'visible', timeout: 60_000 })
        .then(() => true)
        .catch(() => false);

      if (!appeared) {
        outcome.result = 'NO_GENERATE_BUTTON';
        outcome.detail = 'canvas-generate verscheen niet binnen 60s na aanmaken';
        throw new Error(outcome.detail);
      }

      const missing: string[] = [];
      for (const field of required) {
        if (await fillRequiredField(page, field)) {
          outcome.filledFields.push(field.key);
        } else {
          missing.push(`${field.key}:${field.type}`);
        }
      }
      if (missing.length > 0) {
        outcome.result = 'FIELD_UI_MISSING';
        outcome.detail = `verplichte velden niet vindbaar/vulbaar in de UI: ${missing.join(', ')}`;
        throw new Error(outcome.detail);
      }

      if (await generateBtn.isDisabled()) {
        outcome.result = 'BLOCKED_REQUIRED_FIELDS';
        outcome.detail =
          `generate bleef disabled na het vullen van ${outcome.filledFields.length} veld(en). ` +
          `title="${(await generateBtn.getAttribute('title')) ?? ''}"`;
        throw new Error(outcome.detail);
      }

      // ── Genereren + wachten op varianten ────────────────────────
      await generateBtn.click();
      outcome.generateClicked = true;

      // `.first()`: web-page-types renderen hun eigen variants-ready-blok
      // (LandingPageGenerateBlock) binnen dezelfde Step 2-tab. Beide dragen
      // bewust dezelfde testid — ze betekenen hetzelfde — maar zonder .first()
      // zou een dubbele match een strict-mode-fout geven.
      const ready = page.getByTestId('canvas-variants-ready').first();
      const empty = page.getByTestId('canvas-variants-empty').first();
      // Derde staat: de website-types renderen bij een mislukking een eigen
      // foutblok (LandingPageGenerateBlock). Zonder deze tak wacht de spec
      // twaalf minuten op iets dat nooit komt — dat kostte landing-page 722s.
      const failed = page.getByTestId('canvas-generate-error').first();
      await expect(ready.or(empty).or(failed)).toBeVisible({ timeout: 12 * 60_000 });

      if (await failed.isVisible().catch(() => false)) {
        outcome.result = 'GENERATION_FAILED';
        outcome.detail = ((await failed.innerText().catch(() => '')) ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 300);
        throw new Error(outcome.detail || 'generatie faalde met foutblok');
      }

      if (await ready.isVisible().catch(() => false)) {
        outcome.result = 'VARIANTS_READY';
        const text = (await ready.innerText().catch(() => '')) ?? '';
        outcome.detail = `${text.trim().length} tekens in variantenpaneel`;
      } else {
        outcome.result = 'EMPTY';
        outcome.detail = 'generatie eindigde zonder varianten';
        throw new Error(outcome.detail);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (outcome.result === 'ERROR') {
        outcome.result = msg.toLowerCase().includes('timeout') ? 'TIMEOUT' : 'ERROR';
        outcome.detail = msg.split('\n')[0].slice(0, 300);
      }
      throw err;
    } finally {
      outcome.elapsedMs = Date.now() - started;
      record(outcome);
    }
  });
}
