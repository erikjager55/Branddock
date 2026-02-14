/**
 * Unified Card System - Documentation
 * 
 * This document describes the unified card architecture that powers all cards
 * in the application: brand assets, campaigns, deliverables, and validation items.
 * 
 * ## Core Principles
 * 
 * 1. **Single Component**: All cards use the same StatusCard component
 * 2. **Fixed Zones**: Every card has 5 zones (header, meta, body, progress, actions)
 * 3. **Shared Enums**: Status uses unified CardStatus enum
 * 4. **Design Tokens**: All styling comes from design-system.ts
 * 5. **No Overrides**: Variants control differences, not local styles
 * 
 * ## Architecture
 * 
 * ```
 * /components/unified/
 *   ├── design-system.ts    # Tokens, enums, styling
 *   ├── types.ts            # TypeScript interfaces
 *   ├── StatusCard.tsx      # Main component
 *   └── index.ts            # Public API
 * 
 * /utils/
 *   └── status-card-adapters.ts  # Data transformers
 * 
 * /components/[domain]/
 *   └── [Domain]CardUnified.tsx  # Domain-specific wrappers
 * ```
 * 
 * ## Status Enum
 * 
 * ```typescript
 * enum CardStatus {
 *   DRAFT = 'draft',
 *   ACTIVE = 'active',
 *   IN_PROGRESS = 'in-progress',
 *   COMPLETED = 'completed',
 *   LOCKED = 'locked',
 *   NOT_STARTED = 'not-started',
 * }
 * ```
 * 
 * ## Card Structure (5 Zones)
 * 
 * ### 1. Header Zone
 * - Icon (always visible)
 * - Title (required)
 * - Badge (status/quality/custom)
 * 
 * ### 2. Meta Zone
 * - Type label
 * - Category label
 * - Meta items (icon + label + value)
 * 
 * ### 3. Body Zone
 * - Description text
 * - Custom content (React node)
 * 
 * ### 4. Progress Zone
 * - Percentage (required)
 * - Label (optional)
 * - Progress bar (configurable)
 * - Status-driven colors
 * 
 * ### 5. Actions Zone
 * - Primary action button
 * - Secondary action button
 * - Respects card onClick for global action
 * 
 * ## Usage Examples
 * 
 * ### Brand Asset
 * 
 * ```typescript
 * import { brandAssetToCardData } from '../../utils/status-card-adapters';
 * import { StatusCard } from '../unified/StatusCard';
 * 
 * const cardData = brandAssetToCardData(asset, onClick, onMethodClick);
 * return <StatusCard data={cardData} />;
 * ```
 * 
 * ### Campaign
 * 
 * ```typescript
 * import { CampaignCardUnified } from '../campaign-strategy/CampaignCardUnified';
 * 
 * <CampaignCardUnified 
 *   campaign={campaign} 
 *   onClick={() => handleClick(campaign.id)} 
 * />
 * ```
 * 
 * ### Deliverable
 * 
 * ```typescript
 * import { DeliverableCardUnified } from '../campaign-strategy/DeliverableCardUnified';
 * 
 * <DeliverableCardUnified 
 *   deliverable={deliverable} 
 *   onClick={() => handleClick(deliverable.id)} 
 * />
 * ```
 * 
 * ### Validation Item
 * 
 * ```typescript
 * import { ValidationCardUnified } from '../research/ValidationCardUnified';
 * 
 * <ValidationCardUnified 
 *   validation={validation} 
 *   onClick={() => handleClick(validation.id)} 
 * />
 * ```
 * 
 * ## Design Tokens
 * 
 * All visual styling comes from `/components/unified/design-system.ts`:
 * 
 * - Typography scales (header, meta, body, progress)
 * - Spacing system (card, zone, inline)
 * - Border radii and styles
 * - Icon sizes
 * - Status colors (badge, text, bg, border)
 * - Quality colors
 * - Transitions and animations
 * 
 * ## Migration Guide
 * 
 * To migrate existing cards to the unified system:
 * 
 * 1. Create adapter function in `status-card-adapters.ts`
 * 2. Map your data model to `StatusCardData`
 * 3. Create domain wrapper component if needed
 * 4. Replace old card with `<StatusCard data={cardData} />`
 * 5. Remove old component and local styles
 * 
 * ## Benefits
 * 
 * - ✅ Consistent visual design across entire app
 * - ✅ Single source of truth for styling
 * - ✅ Easy to maintain and update
 * - ✅ Type-safe with TypeScript
 * - ✅ Reduced code duplication
 * - ✅ Predictable behavior
 * - ✅ Accessible by default
 * 
 * ## Component Files
 * 
 * ### Core System
 * - `/components/unified/StatusCard.tsx` - Main component
 * - `/components/unified/design-system.ts` - Design tokens
 * - `/components/unified/types.ts` - TypeScript types
 * - `/utils/status-card-adapters.ts` - Data transformers
 * 
 * ### Domain Components
 * - `/components/brand-assets/EnhancedAssetCardNew.tsx` - Brand assets
 * - `/components/campaign-strategy/CampaignCardUnified.tsx` - Campaigns
 * - `/components/campaign-strategy/DeliverableCardUnified.tsx` - Deliverables
 * - `/components/research/ValidationCardUnified.tsx` - Validation items
 * 
 * ### Legacy (Deprecated)
 * - `/components/brand-assets/EnhancedAssetCard.tsx` - Old asset card
 * 
 * ## Maintenance
 * 
 * To update styling globally:
 * 1. Edit tokens in `design-system.ts`
 * 2. Changes apply to all cards automatically
 * 3. No need to update individual components
 * 
 * To add new card type:
 * 1. Create adapter in `status-card-adapters.ts`
 * 2. Optionally create domain wrapper component
 * 3. Use existing StatusCard component
 * 
 * ## Testing
 * 
 * All cards should:
 * - Display correct status colors
 * - Show/hide zones based on data
 * - Handle clicks properly
 * - Support keyboard navigation
 * - Be accessible (ARIA labels)
 * - Render consistently across variants
 */

export const UNIFIED_CARD_SYSTEM_VERSION = '1.0.0';
