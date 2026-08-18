// Entry-barrel voor de design-sync. NIET door de app gebruikt.
//
// WAAROM DIT BESTAAD BESTAAT: de converter synthetiseert anders zelf een entry door
// élk .tsx onder de bronroot te globben — dan belandt de complete SaaS-app in de
// bundel. En importeren via `@/components/shared` (de app-barrel) trekt
// `OptimizedImage` -> `next/image` -> Next-internals mee, waarna de bundel bij
// evaluatie crasht op `process is not defined`. Daarom: elk component uit zijn
// eigen bestand.
//
// Scope-besluiten (2026-08-18, gemeten):
//   - src/components/ui/*.tsx is 36/40 dode code (nul importeurs) -> niet gesynct.
//     Alleen AIErrorCard, InfoBox, ModelUnavailableNotice en popover leven.
//   - Bij naambotsingen wint shared/ (Button 110 importeurs vs 0 voor de shadcn-variant).
//     PageHeader is de uitzondering: daar wint ui/layout (15 vs 0).
//   - Niet opgenomen: OptimizedImage (next/image werkt niet buiten Next),
//     WorkspaceSwitchGuard (vereist workspace-context), ItemKnowledgeSources en
//     KnowledgeContextSelectorModal (importeren de app-barrel).
//   - StatsCard/StatsCardGrid: doet `import * as LucideIcons` voor icoon-op-naam-lookup
//     en trekt daarmee de HELE iconenbibliotheek de bundel in (155 KB -> 1727 KB, 11x).
//     Bovendien nergens in de app gebruikt. Niet gesynct.

// ── Laag 1: ui/layout — de verplichte pagina-primitives (PATTERNS.md) ──────────
export * from '@/components/ui/layout';

// ── Laag 2: shared/ — de laag waar de app zijn pagina's mee bouwt ─────────────
export { Badge } from '@/components/shared/Badge';
export { BrandContextTagsEditor } from '@/components/shared/BrandContextTagsEditor';
export { Button } from '@/components/shared/Button';
export { Card } from '@/components/shared/Card';
export { ComingSoonPage } from '@/components/shared/ComingSoonPage';
export { CreditCostHint } from '@/components/shared/CreditCostHint';
export { CrossLinkCard } from '@/components/shared/CrossLinkCard';
export { EmptyState } from '@/components/shared/EmptyState';
export { ImageProviderGrid } from '@/components/shared/ImageProviderGrid';
export { Input } from '@/components/shared/Input';
export { LazyWrapper } from '@/components/shared/LazyWrapper';
export { Modal } from '@/components/shared/Modal';
export { PageContainer } from '@/components/shared/PageContainer';
export { ProgressBar } from '@/components/shared/ProgressBar';
export { SearchInput } from '@/components/shared/SearchInput';
export { Select } from '@/components/shared/Select';
export { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar, SkeletonBadge } from '@/components/shared/Skeleton';
export { StatCard } from '@/components/shared/StatCard';
export { StyleGuidelinesEditor } from '@/components/shared/StyleGuidelinesEditor';

// ── Laag 3: de vier levende shadcn/ui-bestanden ──────────────────────────────
export { AIErrorCard } from '@/components/ui/AIErrorCard';
export { InfoBox, InfoMessage, SuccessMessage, WarningMessage, ErrorMessage } from '@/components/ui/InfoBox';
export { ModelUnavailableNotice } from '@/components/ui/ModelUnavailableNotice';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '@/components/ui/popover';

// ── Provider voor previews (i18n-context; zie preview-provider.tsx) ──────────
export { PreviewProvider } from './preview-provider';
