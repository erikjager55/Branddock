// =============================================================
// Export Format Registry
//
// Single source of truth voor alle design-system export formaten.
// Wordt gebruikt door DesignSystemSection (in-tab panel) en de
// StyleguideHeader export-dropdown. Emitters die nog niet live
// zijn krijgen status: 'soon' en renderen als disabled.
// =============================================================

export type ExportFormatId =
  | 'designmd'
  | 'dtcg'
  | 'tailwind'
  | 'shadcn-css'
  | 'figma-variables'
  | 'style-dictionary'
  | 'brand-brief';

export type ExportStatus = 'ready' | 'soon';

export interface ExportFormat {
  id: ExportFormatId;
  label: string;
  description: string;
  consumers: string[];
  endpoint: string;       // GET URL for download
  status: ExportStatus;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'designmd',
    label: 'DESIGN.md',
    description: 'Google Stitch format — YAML frontmatter + markdown rationale',
    consumers: ['Stitch', 'Claude Code', 'Cursor', 'Antigravity'],
    endpoint: '/api/export/design-system/designmd',
    status: 'ready',
  },
  {
    id: 'dtcg',
    label: 'DTCG tokens.json',
    description: 'W3C Design Tokens spec — $value / $type / $description',
    consumers: ['Figma', 'Style Dictionary', 'Supernova', 'Tokens Studio'],
    endpoint: '/api/export/design-system/dtcg',
    status: 'ready',
  },
  {
    id: 'tailwind',
    label: 'Tailwind theme config',
    description: 'Drop-in theme.extend fragment for tailwind.config.ts',
    consumers: ['v0', 'Bolt', 'shadcn CLI', 'Claude Design'],
    endpoint: '/api/export/design-system/tailwind',
    status: 'ready',
  },
  {
    id: 'shadcn-css',
    label: 'shadcn CSS variables',
    description: 'globals.css :root block with CSS custom properties',
    consumers: ['shadcn/ui', 'v0', 'Lovable'],
    endpoint: '/api/export/design-system/shadcn-css',
    status: 'ready',
  },
  {
    id: 'figma-variables',
    label: 'Figma Variables',
    description: 'Figma Variables JSON with collection + mode wrappers',
    consumers: ['Figma import/export plugins'],
    endpoint: '/api/export/design-system/figma-variables',
    status: 'ready',
  },
  {
    id: 'style-dictionary',
    label: 'Style Dictionary',
    description: 'Style Dictionary source JSON with .value nesting',
    consumers: ['Amazon Style Dictionary'],
    endpoint: '/api/export/design-system/style-dictionary',
    status: 'ready',
  },
  {
    id: 'brand-brief',
    label: 'Brand Brief (AGENTS.md)',
    description: 'Markdown brief with voice, foundation, personas + competitors',
    consumers: ['Claude Code', 'Cursor', 'Windsurf', 'Copilot', 'Aider'],
    endpoint: '/api/export/design-system/brand-brief',
    status: 'ready',
  },
];

export function getExportFormat(id: ExportFormatId): ExportFormat | undefined {
  return EXPORT_FORMATS.find((f) => f.id === id);
}
