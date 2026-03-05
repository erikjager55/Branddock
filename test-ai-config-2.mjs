import { chromium } from 'playwright';

const SCREENSHOTS_DIR = '/Users/erikjager/Projects/branddock-app/test-screenshots';
const BASE_URL = 'http://localhost:3000';

async function screenshot(page, name) {
  const path = `${SCREENSHOTS_DIR}/${name}`;
  await page.screenshot({ path });
  console.log(`  Screenshot saved: ${name}`);
}

async function clickFirstVisible(page, selectors, label, timeout = 5000) {
  for (const sel of selectors) {
    try {
      const el = await page.locator(sel).first();
      if (await el.isVisible({ timeout: Math.max(1500, timeout / selectors.length) })) {
        await el.click();
        console.log(`  Clicked ${label} via: ${sel}`);
        return true;
      }
    } catch { /* try next */ }
  }
  console.log(`  WARNING: Could not find ${label}`);
  return false;
}

/**
 * Click a tab in the config list view's tab bar.
 * The tab bar is inside a div.border-b with buttons for Brand Assets, Personas, Products.
 */
async function clickConfigTab(page, tabLabel) {
  // Find all buttons that are direct children of the tab bar (border-b container)
  // The tabs are: "Brand Assets <count>", "Personas <count>", "Products <count>"
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = (await btn.textContent())?.trim();
    // Tab button text includes label + count badge, e.g. "Brand Assets12" or "Personas1"
    if (text && text.startsWith(tabLabel)) {
      // Verify it looks like a tab (not a sidebar button) by checking it's small text
      const boundingBox = await btn.boundingBox();
      if (boundingBox && boundingBox.width < 300) {
        await btn.click();
        console.log(`  Clicked "${tabLabel}" tab (text: "${text}", width: ${Math.round(boundingBox.width)}px)`);
        return true;
      }
    }
  }
  console.log(`  WARNING: Tab "${tabLabel}" not found`);
  return false;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = {};

  try {
    // ─── Step 1: Open localhost:3000 ──────────────────────
    console.log('\n=== Step 1: Open localhost:3000 ===');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('  Page loaded');

    // ─── Step 2: Login ───────────────────────────────────
    console.log('\n=== Step 2: Login ===');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.fill('input[type="email"], input[name="email"]', 'erik@branddock.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    const bodyText = await page.textContent('body');
    results.loginSuccess = bodyText?.includes('Dashboard') || bodyText?.includes('Brand');
    console.log(`  Login successful: ${results.loginSuccess}`);

    // ─── Step 3: Navigate to Settings > Administrator ─────
    console.log('\n=== Step 3: Navigate to Settings > Administrator ===');

    // Click "Account" in sidebar
    await clickFirstVisible(page, ['button:has-text("Account")'], '"Account" sidebar');
    await page.waitForTimeout(2000);

    // Click "AI Configuration" in settings sub-nav
    const adminClicked = await clickFirstVisible(page, [
      '[data-testid="settings-tab-administrator"]',
    ], '"AI Configuration" tab');
    await page.waitForTimeout(3000);
    results.navigatedToAdmin = adminClicked;

    const pageContent = await page.textContent('body');
    console.log(`  Config list visible: ${pageContent?.includes('AI Exploration Configuratie')}`);

    // ─── Step 4: Click on "Golden Circle" config card ─────
    console.log('\n=== Step 4: Click Golden Circle config card ===');

    const gcClicked = await clickFirstVisible(page, [
      'h3:has-text("Golden Circle")',
    ], '"Golden Circle" card');
    results.configCardClicked = gcClicked;
    await page.waitForTimeout(2500);

    // ─── Step 5: Test Prompts tab ────────────────────────
    console.log('\n=== Step 5: Test Prompts tab ===');

    const promptsClicked = await clickFirstVisible(page, [
      'button:has-text("Prompts")',
    ], '"Prompts" tab');
    results.promptsTabClicked = promptsClicked;
    await page.waitForTimeout(1500);

    const promptsContent = await page.textContent('body');
    console.log(`  System prompt: ${promptsContent?.includes('System Prompt') || promptsContent?.includes('system')}`);
    console.log(`  Feedback prompt: ${promptsContent?.includes('Feedback')}`);
    console.log(`  Report prompt: ${promptsContent?.includes('Report')}`);
    console.log(`  Template variables: ${promptsContent?.includes('{{brandContext}}') || promptsContent?.includes('brandContext')}`);

    // Check for "Laad standaard" buttons
    const hasLoadDefault = promptsContent?.includes('Laad standaard') || promptsContent?.includes('standaard');
    console.log(`  "Laad standaard" buttons: ${hasLoadDefault}`);

    await screenshot(page, '05-prompts-tab.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-prompts-tab-full.png`, fullPage: true });
    console.log('  Full page screenshot: 05-prompts-tab-full.png');

    // ─── Step 6: Test Kennisbronnen tab ──────────────────
    console.log('\n=== Step 6: Test Kennisbronnen tab ===');

    const knowledgeClicked = await clickFirstVisible(page, [
      'button:has-text("Kennisbronnen")',
    ], '"Kennisbronnen" tab');
    results.knowledgeTabClicked = knowledgeClicked;
    await page.waitForTimeout(2000);

    const knowledgeContent = await page.textContent('body');
    console.log(`  Knowledge content: ${knowledgeContent?.includes('Kennisbronnen') || knowledgeContent?.includes('kennisbron')}`);
    console.log(`  Add button: ${knowledgeContent?.includes('toevoegen') || knowledgeContent?.includes('Toevoegen')}`);

    // Check for info tooltip about {{customKnowledge}}
    const hasInfoText = knowledgeContent?.includes('customKnowledge') || knowledgeContent?.includes('geïnjecteerd');
    console.log(`  Knowledge injection info: ${hasInfoText}`);

    await screenshot(page, '06-kennisbronnen-tab.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-kennisbronnen-tab-full.png`, fullPage: true });
    console.log('  Full page screenshot: 06-kennisbronnen-tab-full.png');

    // ─── Step 7: Click "Terug naar overzicht" ────────────
    console.log('\n=== Step 7: Click "Terug naar overzicht" ===');

    const backClicked = await clickFirstVisible(page, [
      'button:has-text("Terug naar overzicht")',
      ':text("Terug naar overzicht")',
    ], '"Terug naar overzicht"');
    results.backToListClicked = backClicked;
    await page.waitForTimeout(2500);

    // ─── Step 8: Screenshot of list view ─────────────────
    console.log('\n=== Step 8: Screenshot of config list view ===');

    const listContent = await page.textContent('body');
    console.log(`  List title: ${listContent?.includes('AI Exploration Configuratie')}`);

    // Count config cards (filter out sidebar headings)
    const h3Texts = await page.locator('h3').allTextContents();
    const sidebarHeadings = ['WORKSPACE', 'STRATEGY', 'KNOWLEDGE', 'VALIDATION'];
    const configLabels = h3Texts.filter(t => {
      const trimmed = t.trim();
      return trimmed.length > 0 && trimmed.length < 100 && !sidebarHeadings.includes(trimmed);
    });
    console.log(`  Brand Asset configs: ${configLabels.length}`);
    console.log(`  Labels: ${configLabels.join(', ')}`);

    await screenshot(page, '07-config-list-view.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-config-list-view-full.png`, fullPage: true });

    // ─── Step 9: Switch to "Personas" tab ────────────────
    console.log('\n=== Step 9: Switch to Personas tab ===');

    results.personasTabClicked = await clickConfigTab(page, 'Personas');
    await page.waitForTimeout(1500);

    const personaH3s = await page.locator('h3').allTextContents();
    const personaLabels = personaH3s.filter(t => {
      const trimmed = t.trim();
      return trimmed.length > 0 && trimmed.length < 100 && !sidebarHeadings.includes(trimmed);
    });
    console.log(`  Persona configs: ${personaLabels.length}`);
    if (personaLabels.length > 0) console.log(`  Labels: ${personaLabels.join(', ')}`);

    await screenshot(page, '08-personas-tab.png');

    // ─── Step 10: Switch back to Brand Assets + search ───
    console.log('\n=== Step 10: Switch to Brand Assets tab + search "golden" ===');

    results.brandAssetsTabClicked = await clickConfigTab(page, 'Brand Assets');
    await page.waitForTimeout(1500);

    // Verify we're back on Brand Assets
    const afterSwitchH3s = await page.locator('h3').allTextContents();
    const afterSwitchLabels = afterSwitchH3s.filter(t => {
      const trimmed = t.trim();
      return trimmed.length > 0 && trimmed.length < 100 && !sidebarHeadings.includes(trimmed);
    });
    console.log(`  Brand Asset configs after switch: ${afterSwitchLabels.length}`);

    // Search for "golden"
    let searchWorked = false;
    try {
      const searchInput = await page.locator('input[placeholder*="Zoek"]').first();
      if (await searchInput.isVisible({ timeout: 3000 })) {
        await searchInput.fill('golden');
        searchWorked = true;
        console.log('  Typed "golden" in search input');
        await page.waitForTimeout(800);

        const filteredH3s = await page.locator('h3').allTextContents();
        const filteredLabels = filteredH3s.filter(t => {
          const trimmed = t.trim();
          return trimmed.length > 0 && trimmed.length < 100 && !sidebarHeadings.includes(trimmed);
        });
        console.log(`  Filtered results: ${filteredLabels.length} cards`);
        if (filteredLabels.length > 0) console.log(`  Filtered labels: ${filteredLabels.join(', ')}`);
      } else {
        console.log('  Search input not visible');
      }
    } catch (e) {
      console.log(`  Search failed: ${e.message}`);
    }
    results.searchWorked = searchWorked;

    await screenshot(page, '09-search-golden.png');

    // ─── Step 11: Clear search + click "Nieuwe configuratie" ─
    console.log('\n=== Step 11: Clear search + click "Nieuwe configuratie" ===');

    // Clear search
    try {
      const searchInput = await page.locator('input[placeholder*="Zoek"]').first();
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('');
        console.log('  Search cleared');
        await page.waitForTimeout(600);
      }
    } catch {
      console.log('  Could not clear search');
    }

    // Click "Nieuwe configuratie"
    const createClicked = await clickFirstVisible(page, [
      'button:has-text("Nieuwe configuratie")',
    ], '"Nieuwe configuratie" button');
    results.createClicked = createClicked;
    await page.waitForTimeout(2500);

    if (createClicked) {
      const createContent = await page.textContent('body');
      console.log(`  "Nieuw" badge: ${createContent?.includes('Nieuw')}`);
      console.log(`  Tabs: Algemeen=${createContent?.includes('Algemeen')}, Dimensies=${createContent?.includes('Dimensies')}, Prompts=${createContent?.includes('Prompts')}, Kennisbronnen=${createContent?.includes('Kennisbronnen')}`);
      console.log(`  Buttons: Annuleren=${createContent?.includes('Annuleren')}, Opslaan=${createContent?.includes('Opslaan')}`);

      const labels = await page.locator('label').allTextContents();
      const relevantLabels = labels.filter(l => l.trim().length > 0);
      if (relevantLabels.length > 0) {
        console.log(`  Form labels: ${relevantLabels.join(', ')}`);
      }
    }

    await screenshot(page, '10-create-form.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-create-form-full.png`, fullPage: true });
    console.log('  Full page screenshot: 10-create-form-full.png');

    // ─── Final Summary ───────────────────────────────────
    console.log('\n========================================');
    console.log('         TEST SUMMARY');
    console.log('========================================');
    const checks = [
      ['Login successful', results.loginSuccess],
      ['Navigated to Admin', results.navigatedToAdmin],
      ['Config card clicked', results.configCardClicked],
      ['Prompts tab clicked', results.promptsTabClicked],
      ['Kennisbronnen tab clicked', results.knowledgeTabClicked],
      ['Back to list clicked', results.backToListClicked],
      ['Personas tab clicked', results.personasTabClicked],
      ['Brand Assets tab clicked', results.brandAssetsTabClicked],
      ['Search functionality', results.searchWorked],
      ['Create form opened', results.createClicked],
    ];

    let passed = 0;
    let failed = 0;
    for (const [label, result] of checks) {
      const status = result ? 'PASS' : 'FAIL';
      if (result) passed++; else failed++;
      console.log(`${status.padEnd(6)} ${label}`);
    }
    console.log('========================================');
    console.log(`${passed}/${checks.length} passed, ${failed} failed`);
    console.log(`\nOverall: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  } catch (error) {
    console.error('\nTest FAILED with error:', error.message);
    console.error('Stack:', error.stack?.substring(0, 600));
    try {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/error-state-2.png` });
      console.log('Error screenshot saved: error-state-2.png');
    } catch { /* ignore */ }
  } finally {
    await browser.close();
    console.log('\nBrowser closed. Done.');
  }
}

run();
