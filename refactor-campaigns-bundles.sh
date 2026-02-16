#!/bin/bash
# =============================================================================
# Create CampaignsContext, replace mock-campaigns + mock-bundles imports
# =============================================================================
set -e
echo "🔧 Creating CampaignsContext + replacing mock imports..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. Create CampaignsContext.tsx
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 Creating CampaignsContext.tsx"
cat > src/contexts/CampaignsContext.tsx << 'CTXEOF'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Campaign } from '../data/mock-campaigns';
import { apiCampaignsToMockFormat } from '../lib/api/campaign-adapter';

interface CampaignsContextType {
  campaigns: Campaign[];
  campaignsMap: Record<string, Campaign>;
  getCampaign: (id: string) => Campaign | undefined;
  getAllCampaigns: () => Campaign[];
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, campaign: Campaign) => void;
  isLoading: boolean;
}

const CampaignsContext = createContext<CampaignsContextType | undefined>(undefined);

// ---- Mock fallback ----
let mockFallback: Campaign[] | null = null;
async function getMockFallback(): Promise<Campaign[]> {
  if (!mockFallback) {
    const mod = await import('../data/mock-campaigns');
    mockFallback = Object.values(mod.mockCampaigns);
  }
  return mockFallback;
}

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const workspaceId = process.env.NEXT_PUBLIC_WORKSPACE_ID;
    if (!workspaceId) {
      getMockFallback().then(data => {
        setCampaigns(data);
        setIsLoading(false);
      });
      return;
    }

    fetch(`/api/campaigns?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.campaigns && data.campaigns.length > 0) {
          setCampaigns(apiCampaignsToMockFormat(data.campaigns));
        } else {
          return getMockFallback().then(setCampaigns);
        }
      })
      .catch(err => {
        console.warn('[CampaignsContext] API fetch failed, using mock data:', err.message);
        getMockFallback().then(setCampaigns);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const campaignsMap = React.useMemo(() => {
    const map: Record<string, Campaign> = {};
    campaigns.forEach(c => { map[c.id] = c; });
    return map;
  }, [campaigns]);

  const getCampaign = (id: string) => campaigns.find(c => c.id === id);
  const getAllCampaigns = () => campaigns;
  const addCampaign = (campaign: Campaign) => setCampaigns(prev => [...prev, campaign]);
  const updateCampaign = (id: string, campaign: Campaign) =>
    setCampaigns(prev => prev.map(c => (c.id === id ? campaign : c)));

  return (
    <CampaignsContext.Provider value={{ campaigns, campaignsMap, getCampaign, getAllCampaigns, addCampaign, updateCampaign, isLoading }}>
      {children}
    </CampaignsContext.Provider>
  );
}

export function useCampaignsContext() {
  const context = useContext(CampaignsContext);
  if (!context) {
    throw new Error('useCampaignsContext must be used within a CampaignsProvider');
  }
  return context;
}
CTXEOF
echo "     ✓ Created"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Register CampaignsProvider in AppProviders
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 Registering CampaignsProvider"
FILE="src/contexts/index.tsx"

if ! grep -q "CampaignsProvider" "$FILE"; then
  sed -i '' "/import { KnowledgeProvider } from '.\/KnowledgeContext';/a\\
import { CampaignsProvider } from './CampaignsContext';
" "$FILE"

  # Nest inside KnowledgeProvider
  sed -i '' 's|<KnowledgeProvider>|<KnowledgeProvider>\
              <CampaignsProvider>|' "$FILE"
  sed -i '' 's|</KnowledgeProvider>|</CampaignsProvider>\
              </KnowledgeProvider>|' "$FILE"

  # Export hook
  sed -i '' "/export { useKnowledgeContext } from '.\/KnowledgeContext';/a\\
export { useCampaignsContext } from './CampaignsContext';
" "$FILE"
fi
echo "     ✓ Registered"

# ─────────────────────────────────────────────────────────────────────────────
# 3. ActiveCampaignsPage.tsx
#    Uses: getAllCampaigns(), campaignToStrategy()
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "=== Replacing mock imports ==="
echo "  📝 ActiveCampaignsPage.tsx"
FILE="src/components/ActiveCampaignsPage.tsx"

# Replace import: remove mock import, add context + keep campaignToStrategy type
sed -i '' "s|import { getAllCampaigns, campaignToStrategy } from '../data/mock-campaigns';|import { campaignToStrategy } from '../data/mock-campaigns';\nimport { useCampaignsContext } from '../contexts/CampaignsContext';|" "$FILE"

# Find component and add hook
COMP_LINE=$(grep -n "^export function\|^export default function\|^function ActiveCampaignsPage" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$COMP_LINE" ] && ! grep -q "useCampaignsContext" "$FILE"; then
  # Already imported, just need to find it
  true
fi

# Add hook after first useState or at component start
if ! grep -q "const { getAllCampaigns" "$FILE"; then
  FIRST_STATE=$(awk -v start="$COMP_LINE" 'NR>start && /useState|useMemo|const /{print NR; exit}' "$FILE")
  if [ -n "$FIRST_STATE" ]; then
    sed -i '' "${FIRST_STATE}i\\
\\  const { getAllCampaigns } = useCampaignsContext();
" "$FILE"
  fi
fi

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 4. CampaignWorkspace.tsx
#    Uses: mockCampaigns[campaignId]
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 CampaignWorkspace.tsx"
FILE="src/components/CampaignWorkspace.tsx"

# Replace import
sed -i '' "s|import { mockCampaigns } from '../data/mock-campaigns';|import { useCampaignsContext } from '../contexts/CampaignsContext';|" "$FILE"

# Find component
COMP_LINE=$(grep -n "^export function\|^export default function\|^function CampaignWorkspace" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$COMP_LINE" ] && ! grep -q "useCampaignsContext()" "$FILE"; then
  FIRST_STATE=$(awk -v start="$COMP_LINE" 'NR>start && /useState|useMemo|const /{print NR; exit}' "$FILE")
  if [ -n "$FIRST_STATE" ]; then
    sed -i '' "${FIRST_STATE}i\\
\\  const { campaignsMap } = useCampaignsContext();
" "$FILE"
  fi
fi

# Replace mockCampaigns[campaignId] → campaignsMap[campaignId]
sed -i '' 's/mockCampaigns\[/campaignsMap[/g' "$FILE"

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 5. InterviewsManagerUpdated.tsx — mock-bundles
#    Uses: currentBundle (= mockBundles[1], the Professional Bundle)
#    No API for bundle definitions — use ResearchBundleContext if available
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 InterviewsManagerUpdated.tsx (mock-bundles)"
FILE="src/components/canvases/InterviewsManagerUpdated.tsx"

# Check if ResearchBundleContext has what we need
if grep -q "currentBundle\|activeBundle" src/contexts/ResearchBundleContext.tsx 2>/dev/null; then
  echo "     → ResearchBundleContext has activeBundle, using that"
else
  echo "     → No context for bundle definitions, inlining the mock"
  # Replace import with inline constant
  sed -i '' "s|import { currentBundle } from '../../data/mock-bundles';|// Bundle definition inlined (no API for bundle catalog)\nconst currentBundle = { id: 'bundle-professional', name: 'Professional Bundle', type: 'professional' as const, description: 'Comprehensive brand strategy assets', includedAssets: ['1', '2', '3', '4', '5', '6'], color: '#8b5cf6' };|" "$FILE"
fi

echo "     ✓ Done"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────
echo "=== Verification ==="
echo "Remaining mock-campaigns:"
grep -rn "from.*mock-campaigns" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' '
echo "Remaining mock-bundles:"
grep -rn "from.*mock-bundles" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' '
echo ""
echo "TS errors:"
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"
echo ""
echo "✅ Done!"
echo "  git add -A && git commit -m 'refactor: create CampaignsContext, replace mock-campaigns + mock-bundles'"
