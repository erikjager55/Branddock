import { chromium } from 'playwright';

const SCREENSHOTS_DIR = '/Users/erikjager/Projects/branddock-app/test-screenshots';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(`PAGE ERROR: ${err.message}`);
  });

  // Capture network errors for API calls
  const apiErrors = [];
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      apiErrors.push({ url: response.url(), status: response.status() });
    }
  });

  // Also capture successful API calls to exploration endpoints
  const explorationCalls = [];
  page.on('response', async response => {
    if (response.url().includes('/exploration/') || response.url().includes('/ai-analysis/')) {
      try {
        const body = await response.text();
        explorationCalls.push({
          url: response.url(),
          status: response.status(),
          body: body.substring(0, 500)
        });
      } catch (e) {
        explorationCalls.push({ url: response.url(), status: response.status(), body: 'could not read' });
      }
    }
  });

  try {
    // Step 1: Navigate and login
    console.log('Step 1: Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(5000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-01-initial-page.png`, fullPage: false });

    // Login
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    if (emailInput) {
      console.log('Step 2: Logging in...');
      await emailInput.fill('erik@branddock.com');
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) await passwordInput.fill('Password123!');
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-02-login-filled.png`, fullPage: false });

      const loginButton = await page.$('button[type="submit"]');
      if (loginButton) {
        await loginButton.click();
        await sleep(6000);
      }
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-03-after-login.png`, fullPage: false });
      console.log('  Logged in successfully');
    }

    // Step 3: Click Brand Foundation in sidebar
    console.log('Step 3: Clicking Brand Foundation...');
    const sidebarButtons = await page.$$('button');
    for (const btn of sidebarButtons) {
      const text = await btn.textContent();
      if (text && text.includes('Brand Foundation')) {
        const box = await btn.boundingBox();
        if (box && box.x < 200) {
          await btn.click();
          break;
        }
      }
    }
    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-04-brand-foundation.png`, fullPage: false });
    console.log('  Brand Foundation page loaded');

    // Step 4: Click Purpose Statement card
    console.log('Step 4: Clicking Purpose Statement card...');
    const allElements = await page.$$('h3, h4, span, p, div');
    for (const el of allElements) {
      const text = await el.textContent().catch(() => '');
      if (text && text.trim() === 'Purpose Statement') {
        const box = await el.boundingBox().catch(() => null);
        if (box && box.x > 170 && box.y > 350 && box.y < 500) {
          console.log(`  Clicking Purpose Statement at (${box.x}, ${box.y})`);
          await el.click();
          break;
        }
      }
    }
    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-05-asset-detail.png`, fullPage: false });
    console.log('  Purpose Statement detail loaded');

    // Step 5: Find and click "+ Start" button next to "AI Exploration" in the sidebar
    console.log('Step 5: Looking for AI Exploration "+ Start" button...');

    // The "+ Start" button for AI Exploration is in the right sidebar
    // It's in the Validation Methods section
    // We need to find a button with text "+ Start" that's near "AI Exploration" text

    // First, let's find the AI Exploration text to know its location
    let aiExplorationY = null;
    const aiTextElements = await page.$$('span, p, div, h3, h4');
    for (const el of aiTextElements) {
      const text = await el.textContent().catch(() => '');
      if (text && text.trim() === 'AI Exploration') {
        const box = await el.boundingBox().catch(() => null);
        if (box && box.x > 900) {  // Right sidebar area
          aiExplorationY = box.y;
          console.log(`  Found "AI Exploration" text at (${box.x}, ${box.y})`);
          break;
        }
      }
    }

    // Now find the "+ Start" button near that Y position
    let startClicked = false;
    if (aiExplorationY) {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent().catch(() => '');
        const box = await btn.boundingBox().catch(() => null);
        if (text && text.includes('Start') && box && box.x > 900 && Math.abs(box.y - aiExplorationY) < 30) {
          console.log(`  Found "+ Start" button at (${box.x}, ${box.y}), clicking...`);
          await btn.click();
          startClicked = true;
          break;
        }
      }
    }

    if (!startClicked) {
      // Try clicking on the "AI Exploration" text/row itself - it might be clickable
      console.log('  + Start button not found by position. Trying to click AI Exploration row...');
      const allBtns = await page.$$('button, a, [role="button"], div[class*="cursor"]');
      for (const el of allBtns) {
        const text = await el.textContent().catch(() => '');
        if (text && text.includes('AI Exploration') && text.includes('Start')) {
          const box = await el.boundingBox().catch(() => null);
          if (box) {
            console.log(`  Found AI Exploration row with Start: "${text.trim().substring(0, 80)}" at (${box.x}, ${box.y})`);
            await el.click();
            startClicked = true;
            break;
          }
        }
      }
    }

    if (!startClicked) {
      // Last resort: just find any button with text "Start" in the right sidebar area
      console.log('  Trying any "Start" button in right sidebar...');
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent().catch(() => '');
        const box = await btn.boundingBox().catch(() => null);
        if (text && text.includes('Start') && box && box.x > 900) {
          console.log(`  Found Start button: "${text.trim()}" at (${box.x}, ${box.y})`);
          // Click the first one (should be AI Exploration since it's listed first)
          await btn.click();
          startClicked = true;
          break;
        }
      }
    }

    console.log(`  Start button clicked: ${startClicked}`);

    // Wait for the AI Exploration page to load
    console.log('Step 6: Waiting for AI Exploration to load...');
    await sleep(8000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-06-ai-exploration.png`, fullPage: false });
    console.log('Screenshot 6: AI Exploration initial state');

    // Wait a bit more for the AI response to come in
    await sleep(5000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-07-ai-exploration-chat.png`, fullPage: false });
    console.log('Screenshot 7: AI Exploration chat with messages');

    // Take a full page screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-08-full-page.png`, fullPage: true });
    console.log('Screenshot 8: Full page view');

    // Check for error elements on the page
    const errorTexts = await page.$$eval('[class*="error" i], [class*="Error"], [role="alert"], [class*="destructive"]', els =>
      els.filter(el => el.offsetParent !== null).map(el => el.textContent?.trim().substring(0, 200))
    );
    if (errorTexts.filter(Boolean).length > 0) {
      console.log('\n--- Error elements on page ---');
      for (const t of errorTexts.filter(Boolean)) {
        console.log(`  "${t}"`);
      }
    }

    // Check page content for the chat interface
    const pageContent = await page.$eval('body', el => el.textContent?.replace(/\s+/g, ' ').trim().substring(0, 600));
    console.log(`\nPage content snippet: "${pageContent?.substring(0, 400)}"`);

    // Log exploration API calls
    if (explorationCalls.length > 0) {
      console.log('\n--- Exploration API calls ---');
      for (const call of explorationCalls) {
        console.log(`  ${call.status}: ${call.url}`);
        console.log(`    Body: ${call.body?.substring(0, 300)}`);
      }
    }

    // Log API errors
    if (apiErrors.length > 0) {
      console.log('\n--- API Errors ---');
      for (const err of apiErrors) {
        console.log(`  ${err.status}: ${err.url}`);
      }
    }

    // Log console errors
    if (consoleErrors.length > 0) {
      console.log('\n--- Console Errors ---');
      for (const err of consoleErrors.slice(0, 20)) {
        console.log(`  ${err.substring(0, 300)}`);
      }
    } else {
      console.log('\nNo console errors');
    }

  } catch (error) {
    console.error('Test failed with error:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/exploration-error.png`, fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
