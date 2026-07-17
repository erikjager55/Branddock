// =============================================================
// GET /.well-known/oauth-authorization-server — OAuth 2.0
// Authorization Server Metadata (RFC 8414) voor de publieke MCP-server.
//
// Connectors (claude.ai/ChatGPT) ontdekken hier de authorize-, token- en
// registration-endpoints van Branddock-als-OAuth-provider. Moet op de
// domein-root staan (RFC-pad), niet onder /api/auth — vandaar deze
// doorgeefroute naar de Better Auth mcp-plugin-helper. Bewust géén
// feature-flag en géén auth: dit is publieke metadata zonder secrets.
// =============================================================

import { auth } from '@/lib/auth';
import { oAuthDiscoveryMetadata } from 'better-auth/plugins';

export const GET = oAuthDiscoveryMetadata(auth);
