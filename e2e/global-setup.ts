import { execSync } from 'child_process';
import path from 'path';

const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://localhost:5432/branddock_test';

// Safety: ensure E2E always targets a test database
try {
  const dbName = new URL(E2E_DATABASE_URL).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test') && !dbName.includes('_test_')) {
    throw new Error(
      `E2E_DATABASE_URL must point to a test database (name must contain "_test"). Got: "${dbName}"`
    );
  }
} catch (e) {
  if (e instanceof Error && e.message.includes('E2E_DATABASE_URL must point')) throw e;
  throw new Error(`E2E_DATABASE_URL is not a valid URL: ${E2E_DATABASE_URL}`);
}

export default async function globalSetup() {
  const projectRoot = path.resolve(__dirname, '..');

  console.log('[global-setup] Ensuring test database schema is up to date...');
  try {
    execSync('npx prisma db push --skip-generate', {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch {
    console.error('[global-setup] Failed to push schema. Is the branddock_test database created?');
    console.error('  Run: createdb branddock_test');
    throw new Error('Test database schema push failed');
  }

  console.log('[global-setup] Seeding test database...');
  try {
    execSync('npx prisma db seed', {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: E2E_DATABASE_URL,
        NODE_ENV: 'test',
      },
      stdio: 'inherit',
    });
  } catch {
    console.error('[global-setup] Failed to seed test database.');
    throw new Error('Test database seeding failed');
  }

  console.log('[global-setup] Test database seeded.');
}
