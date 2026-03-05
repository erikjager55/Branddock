import { chromium } from 'playwright';

const SCREENSHOTS_DIR = '/Users/erikjager/Projects/branddock-app/test-screenshots';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Step 1: Open localhost:3000
    console.log('Step 1: Opening localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('  Page loaded. Title:', await page.title());

    // Step 2: Log in
    console.log('\nStep 2: Logging in with erik@branddock.com...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    await page.fill('input[type="email"], input[name="email"]', 'erik@branddock.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    console.log('  Credentials submitted');
    
    // Wait for dashboard to load
    await page.waitForTimeout(5000);
    const hasContent = await page.textContent('body');
    console.log('  Login successful:', hasContent?.includes('Dashboard'));

    // Step 3: Navigate to Settings > Administrator
    console.log('\nStep 3: Navigating to Settings > Administrator...');
    
    // The settings-admin route is missing from App.tsx, so we need to:
    // 1. First click "Account" in the sidebar to get to Settings page
    // 2. Then click the "Administrator" sub-nav tab within SettingsPage
    
    // Click "Account" sidebar item to get to SettingsPage
    console.log('  Clicking "Account" to enter Settings page...');
    const accountBtn = await page.locator('button:has-text("Account")').first();
    await accountBtn.click();
    await page.waitForTimeout(2000);
    
    // Verify we're on the Settings page
    const settingsVisible = await page.textContent('body');
    console.log('  On Settings page:', settingsVisible?.includes('Settings') || settingsVisible?.includes('Account'));
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/00-settings-page.png` });
    
    // Now click the "Administrator" tab in the settings sub-navigation
    console.log('  Looking for Administrator tab in settings sub-nav...');
    
    try {
      const adminTab = await page.locator('[data-testid="settings-tab-administrator"]').first();
      if (await adminTab.isVisible({ timeout: 3000 })) {
        await adminTab.click();
        console.log('  Clicked Administrator tab via data-testid');
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      // Fallback: try text-based
      console.log('  data-testid not found, trying text...');
      try {
        const adminEl = await page.locator('button:has-text("Administrator")').first();
        await adminEl.click();
        console.log('  Clicked Administrator button');
        await page.waitForTimeout(2000);
      } catch (e2) {
        console.log('  ERROR: Could not find Administrator tab');
      }
    }

    // Step 4: Take screenshot of config list view
    console.log('\nStep 4: Taking screenshot of AI Configuration list...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-config-list.png` });
    console.log('  Screenshot saved: 01-config-list.png');
    
    // Log what's visible
    const headings = await page.$$('h1, h2, h3, h4');
    for (const h of headings) {
      const text = (await h.textContent())?.trim();
      if (text && !['WORKSPACE', 'STRATEGY', 'KNOWLEDGE', 'VALIDATION'].includes(text)) {
        console.log(`  Heading: "${text}"`);
      }
    }
    
    // Check for config items on the page
    const bodyText = await page.textContent('body');
    const configTerms = ['golden-circle', 'brand-essence', 'persona', 'brand-promise', 'Exploration', 'Configuration', 'exploration'];
    for (const term of configTerms) {
      if (bodyText?.includes(term)) {
        console.log(`  Found "${term}" on page`);
      }
    }

    // Step 5: Click on a config card to open it
    console.log('\nStep 5: Looking for config cards to click...');
    
    let configClicked = false;
    
    // Try finding specific config items
    const searchTerms = [
      'golden-circle', 'brand-essence', 'persona', 'brand-promise',
      'mission-statement', 'vision-statement', 'brand-archetype',
      'brand-personality', 'brand-story', 'social-relevancy',
      'purpose-statement', 'brandhouse-values', 'transformative-goals',
      'Golden Circle', 'Brand Essence', 'Persona'
    ];
    
    for (const term of searchTerms) {
      try {
        const el = await page.locator(`text="${term}"`).first();
        if (await el.isVisible({ timeout: 500 })) {
          console.log(`  Found config item: "${term}"`);
          await el.click();
          configClicked = true;
          console.log(`  Clicked "${term}"`);
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) { /* not found */ }
    }
    
    if (!configClicked) {
      // Try finding config cards by structure -- look for elements that have config-like content
      console.log('  Trying to find config cards by data-testid or class...');
      const cards = await page.$$('[data-testid*="config"], [class*="config"], [class*="Config"]');
      console.log(`  Found ${cards.length} config elements by selector`);
      
      // Try clicking the first clickable item that looks like a config
      const clickableItems = await page.$$('button, [role="button"], [class*="cursor-pointer"]');
      for (const item of clickableItems) {
        const text = (await item.textContent())?.trim();
        if (text && (text.includes('brand_asset') || text.includes('persona') || text.includes('golden') || text.includes('brand'))) {
          if (text.length < 200) {
            console.log(`  Clicking item: "${text.substring(0, 80)}"`);
            await item.click();
            configClicked = true;
            await page.waitForTimeout(2000);
            break;
          }
        }
      }
    }
    
    if (!configClicked) {
      console.log('  WARNING: No config card found to click');
      // List all visible text snippets for debugging
      const paragraphs = await page.$$('p, span, div');
      const snippets = new Set();
      for (const p of paragraphs) {
        const text = (await p.textContent())?.trim();
        if (text && text.length > 3 && text.length < 80) {
          snippets.add(text);
        }
        if (snippets.size > 30) break;
      }
      console.log('  Visible text snippets:', [...snippets].slice(0, 20).join(' | '));
    }

    // Step 6: Take screenshot of detail view
    console.log('\nStep 6: Taking screenshot of config detail view...');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-config-detail.png` });
    console.log('  Screenshot saved: 02-config-detail.png');
    
    // Log current headings
    const detailHeadings = await page.$$('h1, h2, h3, h4');
    for (const h of detailHeadings) {
      const text = (await h.textContent())?.trim();
      if (text && text.length < 80 && !['WORKSPACE', 'STRATEGY', 'KNOWLEDGE', 'VALIDATION'].includes(text)) {
        console.log(`  Heading: "${text}"`);
      }
    }

    // Step 7: Click the "Dimensies" tab
    console.log('\nStep 7: Looking for "Dimensies" tab...');
    
    let dimensiesClicked = false;
    for (const label of ['Dimensies', 'Dimensions', 'dimensions', 'dimensies']) {
      try {
        const tab = await page.locator(`button:has-text("${label}"), [role="tab"]:has-text("${label}")`).first();
        if (await tab.isVisible({ timeout: 1500 })) {
          await tab.click();
          dimensiesClicked = true;
          console.log(`  Clicked "${label}" tab`);
          await page.waitForTimeout(1500);
          break;
        }
      } catch (e) { /* try next */ }
    }
    
    if (!dimensiesClicked) {
      console.log('  Dimensies tab not found. Listing all buttons on page:');
      const btns = await page.$$('button');
      const btnTexts = [];
      for (const btn of btns) {
        const text = (await btn.textContent())?.trim();
        if (text && text.length > 0 && text.length < 60) {
          btnTexts.push(text);
        }
      }
      // Filter out sidebar buttons
      const relevantBtns = btnTexts.filter(t => 
        !['Dashboard', 'Quick Content', 'Overview', 'Campaigns', 'Content Library', 
          'Brand Foundation3', 'Business Strategy', 'Brandstyle', 'Personas',
          'Products & Services', 'Market Insights', 'Knowledge Library',
          'Research Hub', 'Research Bundles', 'Custom Validation', 'Settings',
          'Account', 'Team', 'Agency', 'Clients', 'Billing & Payments',
          'Notifications', 'Appearance', 'AI Configuration', 'Help & Support',
          'Commercial Demo'].includes(t) && !t.startsWith('Brand Alignment')
      );
      console.log('  Non-sidebar buttons:', relevantBtns.join(' | '));
    }

    // Step 8: Take screenshot
    console.log('\nStep 8: Taking screenshot of Dimensies view...');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-dimensies-tab.png` });
    console.log('  Screenshot saved: 03-dimensies-tab.png');

    // Step 9: Try to click "Dimensie toevoegen" button
    console.log('\nStep 9: Looking for "Dimensie toevoegen" button...');
    
    let addClicked = false;
    for (const label of ['Dimensie toevoegen', 'Add Dimension', 'Add dimension', 'Toevoegen', 'toevoegen', 'Add']) {
      try {
        const btn = await page.locator(`button:has-text("${label}")`).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          addClicked = true;
          console.log(`  Clicked "${label}"`);
          await page.waitForTimeout(1500);
          break;
        }
      } catch (e) { /* try next */ }
    }
    
    if (!addClicked) {
      console.log('  "Dimensie toevoegen" button not found');
    }

    // Step 10: Take screenshot after clicking add dimension
    console.log('\nStep 10: Taking final screenshot...');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-after-add-dimension.png` });
    console.log('  Screenshot saved: 04-after-add-dimension.png');

    // Full page screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-full-page.png`, fullPage: true });
    console.log('  Full page screenshot saved: 05-full-page.png');

    // Final summary
    console.log('\n=== Test Summary ===');
    console.log('URL:', page.url());
    console.log('Config card clicked:', configClicked ? 'YES' : 'NO');
    console.log('Dimensies tab clicked:', dimensiesClicked ? 'YES' : 'NO');
    console.log('Add dimension clicked:', addClicked ? 'YES' : 'NO');
    console.log('\nTest completed!');
    
  } catch (error) {
    console.error('\nTest FAILED:', error.message);
    console.error('Stack:', error.stack?.substring(0, 500));
    try {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/error-state.png` });
      console.log('Error screenshot saved');
    } catch (e2) { /* ignore */ }
  } finally {
    await browser.close();
  }
}

run();
