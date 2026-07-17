// =============================================================
// GET /.well-known/oauth-protected-resource — OAuth 2.0 Protected
// Resource Metadata (RFC 9728) voor de publieke MCP-server.
//
// Dit is het document waar de WWW-Authenticate-header van /api/mcp naar
// wijst: het vertelt een connector wélke authorization-server (deze zelfde
// origin) tokens uitgeeft voor deze resource. Zonder deze route start een
// claude.ai/ChatGPT-connector de OAuth-flow nooit. Publieke metadata —
// geen auth, geen flag, geen secrets.
// =============================================================

import { auth } from '@/lib/auth';
import { oAuthProtectedResourceMetadata } from 'better-auth/plugins';

export const GET = oAuthProtectedResourceMetadata(auth);
