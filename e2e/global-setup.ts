import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('[global-setup] Seeding database...');

  execSync('npx prisma db seed', {
    cwd: process.cwd().replace('/e2e', ''),
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://erikjager:@localhost:5432/branddock',
    },
    stdio: 'inherit',
  });

  console.log('[global-setup] Database seeded.');
}
