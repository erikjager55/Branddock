export default async function globalTeardown() {
  console.log('[global-teardown] Cleanup complete.');
  // The seed script already truncates all tables on each run,
  // so no additional cleanup is needed here.
  // Add specific teardown logic if external resources (files, caches) are created during tests.
}
