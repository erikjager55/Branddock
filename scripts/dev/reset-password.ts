// =============================================================
// Dev-tool — diagnose + reset het wachtwoord van een Better Auth-account.
//
// Aanleiding: de seed herstelt het wachtwoord van de demo-user
// (erik@branddock.com / DEMO_USER_ID) NIET. Zijn Account-rij overleeft elke
// re-seed (seed.ts regel 127 sluit DEMO_USER_ID uit bij de cleanup) en de
// credential-loop sloeg bestaande accounts over. Het gedocumenteerde
// seed-wachtwoord kon daardoor jarenlang afwijken van wat er in de DB stond.
// De seed is inmiddels gefixt (upsert i.p.v. skip); dit script blijft het
// snelle pad om zonder volledige re-seed weer binnen te komen.
//
// Usage (DATABASE_URL vereist):
//   npx tsx scripts/dev/reset-password.ts <email>              → diagnose + reset naar Password123!
//   npx tsx scripts/dev/reset-password.ts <email> <wachtwoord> → diagnose + reset naar <wachtwoord>
//   npx tsx scripts/dev/reset-password.ts <email> --check      → alleen diagnose, niets wijzigen
//
// Of via npm: npm run db:reset-password -- <email> [wachtwoord|--check]
// =============================================================

import { prisma } from '@/lib/prisma';
import { hashPassword } from 'better-auth/crypto';

const DEFAULT_PASSWORD = 'Password123!';
const MIN_PASSWORD_LENGTH = 8;

/** Blokkeer prod: dit script overschrijft credentials zonder de huidige te kennen. */
function assertNotProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: reset-password is geblokkeerd bij NODE_ENV=production.');
    process.exit(1);
  }
}

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  accounts: { id: string; providerId: string; password: string | null }[];
};

/**
 * Zoekt een gebruiker op e-mail. Better Auth slaat e-mail case-sensitive op,
 * dus een insensitive match voorkomt "gebruiker niet gevonden" bij een typefout
 * in hoofdlettergebruik.
 */
async function findUser(email: string): Promise<UserRow | null> {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      accounts: { select: { id: true, providerId: true, password: true } },
    },
  });
}

function reportDiagnosis(user: UserRow): void {
  console.log(`\nGebruiker : ${user.email} (${user.name ?? 'geen naam'})`);
  console.log(`  id            : ${user.id}`);
  console.log(`  emailVerified : ${user.emailVerified}`);

  if (user.accounts.length === 0) {
    console.log('  accounts      : GEEN — er is nog nooit een login-methode gekoppeld');
    return;
  }

  console.log('  accounts      :');
  for (const account of user.accounts) {
    const kind =
      account.providerId === 'credential'
        ? account.password
          ? 'wachtwoord ingesteld'
          : 'GEEN wachtwoord-hash (login met e-mail/wachtwoord faalt)'
        : 'social login';
    console.log(`    - ${account.providerId}: ${kind}`);
  }

  const hasCredential = user.accounts.some((a) => a.providerId === 'credential');
  if (!hasCredential) {
    console.log('  → Alleen social login gekoppeld; e-mail/wachtwoord werkt pas na een reset.');
  }
}

async function main(): Promise<void> {
  assertNotProduction();

  const [email, second] = process.argv.slice(2);
  if (!email) {
    console.error('Usage: npx tsx scripts/dev/reset-password.ts <email> [wachtwoord|--check]');
    process.exit(1);
  }

  const checkOnly = second === '--check';
  const newPassword = checkOnly ? null : (second ?? DEFAULT_PASSWORD);

  if (newPassword !== null && newPassword.length < MIN_PASSWORD_LENGTH) {
    console.error(`ERROR: wachtwoord moet minimaal ${MIN_PASSWORD_LENGTH} tekens zijn.`);
    process.exit(1);
  }

  const user = await findUser(email);
  if (!user) {
    console.error(`ERROR: geen gebruiker gevonden met e-mail "${email}".`);
    const all = await prisma.user.findMany({ select: { email: true }, orderBy: { email: 'asc' }, take: 25 });
    if (all.length > 0) {
      console.error('Bestaande gebruikers:');
      for (const row of all) console.error(`  - ${row.email}`);
    }
    process.exit(1);
  }

  reportDiagnosis(user);

  if (checkOnly || newPassword === null) {
    console.log('\n--check: niets gewijzigd.');
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  const credential = user.accounts.find((a) => a.providerId === 'credential');
  const now = new Date();

  // Update i.p.v. delete+create: de Account-rij blijft bestaan, dus lopende
  // sessies (Session verwijst naar userId) en gekoppelde OAuth-tokens blijven heel.
  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: passwordHash,
      },
    });
  }

  // Spiegel naar UserPassword, net als POST /api/settings/password doet — dat
  // is de rij waar Settings → Security "laatst gewijzigd" uit leest.
  await prisma.userPassword.upsert({
    where: { userId: user.id },
    update: { passwordHash, lastChangedAt: now },
    create: { userId: user.id, passwordHash, lastChangedAt: now },
  });

  console.log(`\nOK — wachtwoord voor ${user.email} gezet op: ${newPassword}`);
  console.log(credential ? '  (bestaand credential-account bijgewerkt)' : '  (nieuw credential-account aangemaakt)');
  console.log('\nLukt inloggen nog steeds niet? Check de rate-limiter: 10 pogingen per 15 min');
  console.log('op /sign-in/email per IP (src/lib/auth.ts). Wacht 15 min of herstart Redis.');
}

main()
  .catch((error) => {
    console.error('[reset-password]', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
