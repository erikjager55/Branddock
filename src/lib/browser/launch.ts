import type { Browser } from 'playwright-core';

/**
 * Serverless-veilige headless-Chromium launcher.
 *
 * Op Vercel/Lambda (Linux serverless) gebruikt het @sparticuz/chromium — een
 * Chromium-build die binnen de function-bundle past — via playwright-core.
 * Lokaal (dev) start het de systeem-Chrome via de 'chrome'-channel
 * (playwright-core bundelt zelf geen browser). Beide paden geven een Browser;
 * bij launch-failure gooit het — callers houden hun bestaande graceful
 * null/empty-contract aan.
 *
 * Vervangt het oude `await import('playwright')`-patroon (playwright is geen
 * runtime-dep → dat faalde altijd naar null) en het tsx-child-process-worker-
 * pad (draait niet op Vercel).
 */
export async function launchHeadlessBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright-core');
  const isServerless = Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV,
  );

  if (isServerless) {
    const sparticuz = (await import('@sparticuz/chromium')).default;
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }

  // Lokaal: gebruik de systeem-Chrome via de channel. Deze features zijn
  // env-gated en OFF by default, dus lokaal zelden geraakt.
  return chromium.launch({ headless: true, channel: 'chrome' });
}
