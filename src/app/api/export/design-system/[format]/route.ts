import { NextResponse, type NextRequest } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { buildDesignSystemModel } from '@/lib/export/design-system/resolver';
import { emitDesignMd } from '@/lib/export/design-system/emitters/designmd';
import { emitDtcg } from '@/lib/export/design-system/emitters/dtcg';
import { emitTailwindTheme } from '@/lib/export/design-system/emitters/tailwind';
import { emitShadcnCss } from '@/lib/export/design-system/emitters/shadcn';
import { emitFigmaVariables } from '@/lib/export/design-system/emitters/figma-variables';
import { emitStyleDictionary } from '@/lib/export/design-system/emitters/style-dictionary';
import { emitBrandBrief } from '@/lib/export/design-system/emitters/brand-brief';
import { emitBrandMd } from '@/lib/export/design-system/emitters/brandmd';
import { BRAND_MD_USE_HUB_PATH } from '@/lib/brandmd/constants';
import { lintDesignSystem } from '@/lib/export/design-system/linter';

// =============================================================
// GET /api/export/design-system/[format]
//
// Unified export-endpoint voor alle design-system formaten.
// Format-segment bepaalt de emitter en de Content-Type.
//
// Supported formats (V1):
// - designmd   → DESIGN.md (Stitch, MCP-consumers)
// - dtcg       → tokens.json (W3C Design Tokens, Figma, Style Dictionary)
// - tailwind   → tailwind.config theme fragment (v0, shadcn, Bolt)
// - _model     → intern: canonical JSON voor UI preview
//
// Latere uitbreidingen (Sprint 3.1): shadcn-css, figma-variables,
// style-dictionary, brand-brief.
// =============================================================

export const dynamic = 'force-dynamic';

interface FormatSpec {
  contentType: string;
  extension: string;
  render: (workspaceId: string) => Promise<string>;
}

const FORMATS: Record<string, FormatSpec> = {
  brandmd: {
    contentType: 'text/markdown; charset=utf-8',
    extension: 'brand.md',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId, { includeBrandMd: true });
      // Workspace-export = publiek profiel (deelbaar); het extended profiel
      // (incl. Market Context) is alleen via MCP achter auth beschikbaar.
      return emitBrandMd(model, {
        profile: 'public',
        useHubUrl: resolveUseHubUrl(),
      });
    },
  },
  designmd: {
    contentType: 'text/markdown; charset=utf-8',
    extension: 'md',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return emitDesignMd(model);
    },
  },
  dtcg: {
    contentType: 'application/json; charset=utf-8',
    extension: 'tokens.json',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return JSON.stringify(emitDtcg(model), null, 2);
    },
  },
  tailwind: {
    contentType: 'application/json; charset=utf-8',
    extension: 'tailwind.theme.json',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return JSON.stringify(emitTailwindTheme(model), null, 2);
    },
  },
  'shadcn-css': {
    contentType: 'text/css; charset=utf-8',
    extension: 'globals.css',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return emitShadcnCss(model);
    },
  },
  'figma-variables': {
    contentType: 'application/json; charset=utf-8',
    extension: 'figma-variables.json',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return JSON.stringify(emitFigmaVariables(model), null, 2);
    },
  },
  'style-dictionary': {
    contentType: 'application/json; charset=utf-8',
    extension: 'style-dictionary.json',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return JSON.stringify(emitStyleDictionary(model), null, 2);
    },
  },
  'brand-brief': {
    contentType: 'text/markdown; charset=utf-8',
    extension: 'brand-brief.md',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return emitBrandBrief(model);
    },
  },
  _model: {
    contentType: 'application/json; charset=utf-8',
    extension: 'design-system.json',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return JSON.stringify(model, null, 2);
    },
  },
  _lint: {
    contentType: 'application/json; charset=utf-8',
    extension: 'design-system-lint.json',
    async render(workspaceId) {
      const model = await buildDesignSystemModel(workspaceId);
      return JSON.stringify(lintDesignSystem(model), null, 2);
    },
  },
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ format: string }> },
): Promise<NextResponse | Response> {
  try {
    const { format } = await context.params;
    const spec = FORMATS[format];
    if (!spec) {
      return NextResponse.json(
        {
          error: `Unknown format '${format}'`,
          available: Object.keys(FORMATS).filter((k) => !k.startsWith('_')),
        },
        { status: 400 },
      );
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const body = await spec.render(workspaceId);
    const slug = await getWorkspaceSlug(workspaceId);
    const filename = `${slug}-${spec.extension}`;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': spec.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[design-system/export]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 },
    );
  }
}

/**
 * Bouwt de "how to use this file"-URL voor de brand.md-export.
 *
 * Bewust NIET `useHubUrl` genoemd: `react-hooks/rules-of-hooks` gaat puur op het
 * `use`-voorvoegsel af en zag dit als een hook die buiten een component wordt
 * aangeroepen — een false positive in een server-side API-route, maar wel een
 * harde lint-error die de CI-gate op main brak. De optie-sleutel in de
 * emitter-payload heet nog gewoon `useHubUrl`; dat is een property-naam en
 * daar kijkt de regel niet naar.
 */
function resolveUseHubUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  return base ? `${base.replace(/\/$/, '')}${BRAND_MD_USE_HUB_PATH}` : undefined;
}

async function getWorkspaceSlug(workspaceId: string): Promise<string> {
  const { prisma } = await import('@/lib/prisma');
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true },
  });
  return ws?.slug ?? 'workspace';
}
