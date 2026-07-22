/**
 * Emailit smoke test — renders the real invite template and ships it
 * through the live transactional service. Prints the send-id so we
 * can cross-reference it against the Emailit Events tab.
 *
 * Run: npx tsx /tmp/emailit-smoke-test.ts
 *
 * Reads EMAILIT_* env vars from .env.local (loaded by tsx via dotenv).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manual .env.local loader (avoids dotenv dependency)
const envPath = resolve(process.cwd(), '.env.local');
try {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

import { sendTransactional } from '../src/lib/email/transactional';
import { renderInviteEmail } from '../src/lib/email/templates/invite';

const recipient = process.argv[2] ?? 'erik@betterbrands.nl';

const { subject, html, text } = renderInviteEmail({
  recipientEmail: recipient,
  inviterName: 'Sarah van den Berg',
  targetName: 'Acme Studio',
  role: 'owner',
  acceptUrl: 'https://branddock.app/invite/accept?token=' + Math.random().toString(36).slice(2, 20),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

async function main() {
  console.log(`→ sending "${subject}" to ${recipient}`);
  console.log(`→ from: ${process.env.EMAILIT_FROM_NAME} <${process.env.EMAILIT_FROM_EMAIL}>`);

  try {
    const result = await sendTransactional({
      to: recipient,
      subject,
      html,
      text,
      tags: { kind: 'smoke_test', test_run: new Date().toISOString() },
    });

    console.log('✓ Accepted by Emailit');
    console.log('  send id:', result.id);
    console.log('  accepted:', result.accepted);
    if (result.rejected.length > 0) console.log('  rejected:', result.rejected);
    console.log('  raw:', JSON.stringify(result.raw, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('✗ Send failed');
    console.error(err);
    process.exit(1);
  }
}

main();
