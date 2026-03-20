import { getServerSession } from './auth-server';

const developerEmails = new Set(
  (process.env.DEVELOPER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isDeveloperEmail(email: string): boolean {
  return developerEmails.has(email.toLowerCase());
}

/**
 * Check if the current session belongs to a developer.
 * Returns the session if developer, null otherwise.
 */
export async function requireDeveloper() {
  const session = await getServerSession();
  if (!session) return null;
  if (!isDeveloperEmail(session.user.email)) return null;
  return session;
}
