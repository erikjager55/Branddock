// =============================================================
// OAuth-connector-koppelingen van een gebruiker: opsommen + intrekken.
//
// De MCP-connector (claude.ai/ChatGPT) krijgt via de Better-Auth-mcp-plugin
// een OauthAccessToken-rij (access + refresh) per gebruiker per client. Er was
// géén intrek-pad: ontkoppelen in de client stopt alleen die client, de
// tokenrij bleef geldig tot de 60-daagse expiry (audit 2026-07-23, LOW).
//
// Intrekken = de tokenrijen (en de vastgelegde consent) van de gebruiker voor
// die client verwijderen. requireOAuthToken valideert elke MCP-request tegen
// OauthAccessToken; zonder rij volgt onmiddellijk 401 → de connector moet
// opnieuw koppelen. Sessie-gescopet: uitsluitend de eigen koppelingen.
// =============================================================

import { prisma } from '@/lib/prisma';

export interface UserConnection {
  clientId: string;
  appName: string;
  scopes: string;
  tokenCount: number;
  connectedAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

/** Alle actieve connector-koppelingen van de gebruiker, gegroepeerd per client. */
export async function listUserConnections(userId: string): Promise<UserConnection[]> {
  const tokens = await prisma.oauthAccessToken.findMany({
    where: { userId },
    select: {
      clientId: true,
      scopes: true,
      createdAt: true,
      updatedAt: true,
      refreshTokenExpiresAt: true,
      application: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const byClient = new Map<string, UserConnection>();
  for (const t of tokens) {
    const connectedAt = t.createdAt.toISOString();
    const lastActiveAt = t.updatedAt.toISOString();
    const expiresAt = t.refreshTokenExpiresAt.toISOString();
    const existing = byClient.get(t.clientId);
    if (!existing) {
      byClient.set(t.clientId, {
        clientId: t.clientId,
        appName: t.application?.name ?? t.clientId,
        scopes: t.scopes,
        tokenCount: 1,
        connectedAt,
        lastActiveAt,
        expiresAt,
      });
    } else {
      existing.tokenCount += 1;
      if (connectedAt < existing.connectedAt) existing.connectedAt = connectedAt;
      if (lastActiveAt > existing.lastActiveAt) existing.lastActiveAt = lastActiveAt;
      if (expiresAt > existing.expiresAt) existing.expiresAt = expiresAt;
    }
  }
  return [...byClient.values()];
}

/**
 * Trek de connector-koppeling(en) van de gebruiker in: verwijder de token- én
 * consent-rijen. `clientId` weggelaten = álle koppelingen van de gebruiker.
 * Retourneert het aantal ingetrokken token-rijen.
 */
export async function revokeUserConnection(userId: string, clientId?: string): Promise<number> {
  const tokenWhere = clientId ? { userId, clientId } : { userId };
  const [tokens] = await prisma.$transaction([
    prisma.oauthAccessToken.deleteMany({ where: tokenWhere }),
    prisma.oauthConsent.deleteMany({ where: tokenWhere }),
  ]);
  return tokens.count;
}
