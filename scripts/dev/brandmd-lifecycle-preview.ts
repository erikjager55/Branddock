/**
 * Stuurt de vier brand.md lifecycle-mails (2.2 t/m 2.5) als voorbeeld naar één
 * adres, zodat je ze in een echte inbox kunt beoordelen in plaats van in een
 * browser-preview. Rendering is identiek aan de cron — dezelfde
 * `renderLifecycleEmail`, dezelfde layout — alleen de ontvanger en de
 * onderwerp-prefix verschillen.
 *
 * Raakt de database niet en markeert geen stages: dit is puur een render +
 * verzending.
 *
 * Run (key uit het Emailit-dashboard; `vercel env pull` geeft voor sensitive
 * vars een lege string terug — zie gotcha 2026-07-14):
 *
 *   EMAILIT_API_KEY="…" npx tsx scripts/dev/brandmd-lifecycle-preview.ts erik@betterbrands.nl
 *
 * Optioneel een echt domein meegeven om met eigen scan-data te renderen:
 *   … brandmd-lifecycle-preview.ts erik@betterbrands.nl --domain napking.nl --score 71
 */
import { trySendTransactional } from '../../src/lib/email/transactional';
import {
  renderLifecycleEmail,
  type LifecycleStage,
} from '../../src/lib/email/templates/brandmd-lifecycle';

const STAGES: LifecycleStage[] = ['2.2', '2.3', '2.4', '2.5'];

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to || !to.includes('@')) {
    console.error('Usage: brandmd-lifecycle-preview.ts <e-mailadres> [--domain x.nl] [--score 71]');
    process.exit(1);
  }
  if (!process.env.EMAILIT_API_KEY) {
    console.error('EMAILIT_API_KEY ontbreekt — zonder key stuurt dit script niets.');
    process.exit(1);
  }

  const domain = arg('domain', 'napking.nl')!;
  const scoreArg = arg('score', '71')!;
  const base = 'https://branddock.app';

  const vars = {
    brandName: domain.split('.')[0].replace(/^./, (c) => c.toUpperCase()),
    domain,
    score: Number.isFinite(Number(scoreArg)) ? Number(scoreArg) : null,
    downloadUrl: `${base}/api/brandmd/download?token=voorbeeld`,
    claimUrl: `${base}/brandmd/claim/voorbeeld`,
    generatorUrl: `${base}/brandmd`,
    useHubUrl: `${base}/brandmd/use`,
    unsubscribeUrl: `${base}/api/brandmd/unsubscribe?token=voorbeeld`,
    generatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    // Een verse scan bevestigt geen enkele sectie — dat is precies wat 2.4
    // aan de lezer voorlegt.
    unvalidatedSections: ['strategy', 'voice', 'visual', 'audience', 'products'],
    hasVoice: true,
  };

  let failed = 0;
  for (const stage of STAGES) {
    const mail = renderLifecycleEmail(stage, vars);
    const res = await trySendTransactional({
      to,
      // Prefix zodat een voorbeeld nooit met een echte lifecycle-mail te
      // verwarren is — niet in je inbox en niet in de Emailit-statistieken.
      subject: `[VOORBEELD ${stage}] ${mail.subject}`,
      html: mail.html,
      text: mail.text,
      tags: { flow: 'brandmd-lifecycle-preview', stage },
    });
    if (res.ok) {
      console.log(`✓ ${stage}  ${mail.subject}`);
    } else {
      failed += 1;
      console.error(`✗ ${stage}  ${res.error}`);
    }
  }

  console.log(`\n${STAGES.length - failed}/${STAGES.length} verstuurd naar ${to}`);
  if (failed > 0) process.exitCode = 1;
}

main();
