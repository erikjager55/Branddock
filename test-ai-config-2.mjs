import { chromium } from 'playwright';

const SCREENSHOTS_DIR = '/Users/erikjager/Projects/branddock-app/test-screenshots';
const BASE_URL = 'http://localhost:3000';

/**
 * Helper: take a screenshot with logging.
 */
async function screenshot(page, name) {
  const path = `${SCREENSHOTS_DIR}/${name}`;
  await page.screenshot({ path });
  console.log(`  Screenshot saved: ${name}`);
}

/**
 * Helper: try multiple selectors, click first visible one.
 */
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

    // Click "Account" text in the sidebar to enter Settings page
    await clickFirstVisible(page, [
      'button:has-text("Account")',
    ], '"Account" sidebar item');
    await page.waitForTimeout(2000);

    // Click "AI Configuration" in the settings sub-nav
    const adminClicked = await clickFirstVisible(page, [
      '[data-testid="settings-tab-administrator"]',
      'button:has-text("AI Configuration")',
    ], '"AI Configuration" tab');
    await page.waitForTimeout(3000);

    results.navigatedToAdmin = adminClicked;

    // Verify the config list loaded
    const pageContent = await page.textContent('body');
    console.log(`  Config list visible: ${pageContent?.includes('AI Exploration Configuratie')}`);

    // ─── Step 4: Click on "Golden Circle" config card ─────
    console.log('\n=== Step 4: Click Golden Circle config card ===');

    let gcClicked = false;
    // The ConfigCard renders h3 with the display label
    for (const sel of ['h3:has-text("Golden Circle")', 'text="Golden Circle"', ':text("golden-circle")']) {
      try {
        const el = await page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.click();
          gcClicked = true;
          console.log(`  Clicked Golden Circle via: ${sel}`);
          break;
        }
      } catch { /* try next */ }
    }
    results.configCardClicked = gcClicked;
    await page.waitForTimeout(2500);

    // ─── Step 5: Test Prompts tab ────────────────────────
    console.log('\n=== Step 5: Test Prompts tab ===');

    const promptsClicked = await clickFirstVisible(page, [
      'button:has-text("Prompts")',
    ], '"Prompts" tab');
    results.promptsTabClicked = promptsClicked;
    await page.waitForTimeout(1500);

    // Verify prompts sections
    const promptsContent = await page.textContent('body');
    console.log(`  System prompt visible: ${promptsContent?.includes('System Prompt') || promptsContent?.includes('system')}`);
    console.log(`  Feedback prompt visible: ${promptsContent?.includes('Feedback')}`);
    console.log(`  Report prompt visible: ${promptsContent?.includes('Report')}`);

    // Check for template variables
    const hasTemplateVars = promptsContent?.includes('{{brandContext}}') || promptsContent?.includes('brandContext');
    console.log(`  Template variables shown: ${hasTemplateVars}`);

    await screenshot(page, '05-prompts-tab.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-prompts-tab-full.png`, fullPage: true });
    console.log('  Full page screenshot saved: 05-prompts-tab-full.png');

    // ─── Step 6: Test Kennisbronnen tab ──────────────────
    console.log('\n=== Step 6: Test Kennisbronnen tab ===');

    const knowledgeClicked = await clickFirstVisible(page, [
      'button:has-text("Kennisbronnen")',
    ], '"Kennisbronnen" tab');
    results.knowledgeTabClicked = knowledgeClicked;
    await page.waitForTimeout(2000);

    const knowledgeContent = await page.textContent('body');
    console.log(`  Knowledge tab content loaded: ${knowledgeContent?.includes('Kennisbronnen') || knowledgeContent?.includes('kennisbron')}`);
    console.log(`  Has add button: ${knowledgeContent?.includes('toevoegen') || knowledgeContent?.includes('Toevoegen')}`);

    await screenshot(page, '06-kennisbronnen-tab.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-kennisbronnen-tab-full.png`, fullPage: true });
    console.log('  Full page screenshot saved: 06-kennisbronnen-tab-full.png');

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

    // Count config cards in Brand Assets tab (default)
    const h3Elements = await page.locator('h3').allTextContents();
    const configLabels = h3Elements.filter(t =>
      t.trim().length > 0 &&
      t.length < 100 &&
      !['WORKSPACE', 'STRATEGY', 'KNOWLEDGE', 'VALIDATION', 'Settings', 'AI Exploration Configuratie'].includes(t.trim())
    );
    console.log(`  Brand Asset config cards: ${configLabels.length}`);
    console.log(`  Labels: ${configLabels.join(', ')}`);

    await screenshot(page, '07-config-list-view.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-config-list-view-full.png`, fullPage: true });

    // ─── Step 9: Switch to "Personas" tab ────────────────
    console.log('\n=== Step 9: Switch to Personas tab ===');

    // The tab buttons are in a border-b container. Each tab is a <button> with text + count badge.
    // "Personas" button text actually includes the count span, e.g. "Personas1"
    // Use a more targeted selector
    const personasTabClicked = await clickFirstVisible(page, [
      'button:has-text("Personas")',
    ], '"Personas" tab');
    results.personasTabClicked = personasTabClicked;
    await page.waitForTimeout(1500);

    const personaH3s = await page.locator('h3').allTextContents();
    const personaLabels = personaH3s.filter(t =>
      t.trim().length > 0 &&
      t.length < 100 &&
      !['WORKSPACE', 'STRATEGY', 'KNOWLEDGE', 'VALIDATION', 'Settings', 'AI Exploration Configuratie'].includes(t.trim())
    );
    console.log(`  Persona config cards: ${personaLabels.length}`);
    if (personaLabels.length > 0) {
      console.log(`  Labels: ${personaLabels.join(', ')}`);
    }

    await screenshot(page, '08-personas-tab.png');

    // ─── Step 10: Switch back to Brand Assets + search ───
    console.log('\n=== Step 10: Switch to Brand Assets tab + search "golden" ===');

    // We need to click "Brand Assets" tab. The button text is "Brand Assets" + count badge.
    // The issue before: button:has-text("Brand Assets") matched something else.
    // Let's use a more specific approach: get all buttons in the tab bar area.
    let brandAssetsClicked = false;
    const tabButtons = await page.locator('button').all();
    for (const btn of tabButtons) {
      const text = (await btn.textContent())?.trim();
      // Match "Brand Assets" with possible count, e.g. "Brand Assets12"
      if (text && /^Brand Assets\d*$/.test(text)) {
        await btn.click();
        brandAssetsClicked = true;
        console.log(`  Clicked Brand Assets tab (text: "${text}")`);
        break;
      }
    }
    if (!brandAssetsClicked) {
      // Fallback: try broader match
      for (const btn of tabButtons) {
        const text = (await btn.textContent())?.trim();
        if (text && text.startsWith('Brand Assets')) {
          await btn.click();
          brandAssetsClicked = true;
          console.log(`  Clicked Brand Assets tab via fallback (text: "${text}")`);
          break;
        }
      }
    }
    results.brandAssetsTabClicked = brandAssetsClicked;
    await page.waitForTimeout(1500);

    // Now search for "golden"
    let searchWorked = false;
    try {
      // The SearchInput has placeholder "Zoek op label of subtype..."
      const searchInput = await page.locator('input[placeholder*="Zoek"]').first();
      if (await searchInput.isVisible({ timeout: 3000 })) {
        await searchInput.fill('golden');
        searchWorked = true;
        console.log('  Typed "golden" in search input');
        await page.waitForTimeout(800);

        // Check filtered results
        const filteredH3s = await page.locator('h3').allTextContents();
        const filteredLabels = filteredH3s.filter(t =>
          t.trim().length > 0 &&
          t.length < 100 &&
          !['WORKSPACE', 'STRATEGY', 'KNOWLEDGE', 'VALIDATION', 'Settings', 'AI Exploration Configuratie'].includes(t.trim())
        );
        console.log(`  Filtered results: ${filteredLabels.length} cards`);
        if (filteredLabels.length > 0) {
          console.log(`  Filtered labels: ${filteredLabels.join(', ')}`);
        }
      }
    } catch (e) {
      console.log(`  Search input not found: ${e.message}`);
    }
    results.searchWorked = searchWorked;

    await screenshot(page, '09-search-golden.png');

    // ─── Step 11: Clear search + click "Nieuwe configuratie" ─
    console.log('\n=== Step 11: Clear search + click "Nieuwe configuratie" ===');

    // Clear the search
    try {
      const searchInput = await page.locator('input[placeholder*="Zoek"]').first();
      await searchInput.fill('');
      console.log('  Search cleared');
      await page.waitForTimeout(800);
    } catch {
      console.log('  Could not clear search');
    }

    // Click "Nieuwe configuratie" button
    const createClicked = await clickFirstVisible(page, [
      'button:has-text("Nieuwe configuratie")',
    ], '"Nieuwe configuratie" button');
    results.createClicked = createClicked;
    await page.waitForTimeout(2500);

    if (createClicked) {
      // Verify create form
      const createContent = await page.textContent('body');
      const hasNieuwBadge = createContent?.includes('Nieuw');
      const hasAlgemeenTab = createContent?.includes('Algemeen');
      const hasDimensiesTab = createContent?.includes('Dimensies');
      const hasPromptsTab = createContent?.includes('Prompts');
      const hasKennisbronnenTab = createContent?.includes('Kennisbronnen');
      const hasAnnuleren = createContent?.includes('Annuleren');
      const hasOpslaan = createContent?.includes('Opslaan');
      console.log(`  "Nieuw" badge: ${hasNieuwBadge}`);
      console.log(`  Tabs visible: Algemeen=${hasAlgemeenTab}, Dimensies=${hasDimensiesTab}, Prompts=${hasPromptsTab}, Kennisbronnen=${hasKennisbronnenTab}`);
      console.log(`  Actions: Annuleren=${hasAnnuleren}, Opslaan=${hasOpslaan}`);

      // List form labels
      const labels = await page.locator('label').allTextContents();
      const relevantLabels = labels.filter(l => l.trim().length > 0);
      if (relevantLabels.length > 0) {
        console.log(`  Form labels: ${relevantLabels.join(', ')}`);
      }
    }

    await screenshot(page, '10-create-form.png');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-create-form-full.png`, fullPage: true });
    console.log('  Full page screenshot saved: 10-create-form-full.png');

    // ─── Final Summary ───────────────────────────────────
    console.log('\n========================================');
    console.log('         TEST SUMMARY');
    console.log('========================================');
    console.log(`Login successful:          ${results.loginSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`Navigated to Admin:        ${results.navigatedToAdmin ? 'PASS' : 'FAIL'}`);
    console.log(`Config card clicked:       ${results.configCardClicked ? 'PASS' : 'FAIL'}`);
    console.log(`Prompts tab clicked:       ${results.promptsTabClicked ? 'PASS' : 'FAIL'}`);
    console.log(`Kennisbronnen tab clicked: ${results.knowledgeTabClicked ? 'PASS' : 'FAIL'}`);
    console.log(`Back to list clicked:      ${results.backToListClicked ? 'PASS' : 'FAIL'}`);
    console.log(`Personas tab clicked:      ${results.personasTabClicked ? 'PASS' : 'FAIL'}`);
    console.log(`Brand Assets tab clicked:  ${results.brandAssetsTabClicked ? 'PASS' : 'FAIL'}`);
    console.log(`Search functionality:      ${results.searchWorked ? 'PASS' : 'FAIL'}`);
    console.log(`Create form opened:        ${results.createClicked ? 'PASS' : 'FAIL'}`);
    console.log('========================================');

    const allPassed = Object.values(results).every(v => v === true);
    console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

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
