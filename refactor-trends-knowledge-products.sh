#!/bin/bash
# =============================================================================
# Create TrendsContext + KnowledgeContext, replace mock imports
# =============================================================================
set -e
echo "🔧 Creating TrendsContext + KnowledgeContext + replacing mock imports..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. Create TrendsContext.tsx
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 Creating TrendsContext.tsx"
cat > src/contexts/TrendsContext.tsx << 'CTXEOF'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Trend } from '../data/mock-trends';
import { apiTrendsToMockFormat } from '../lib/api/trend-adapter';

interface TrendsContextType {
  trends: Trend[];
  addTrend: (trend: Trend) => void;
  updateTrend: (id: string, trend: Trend) => void;
  deleteTrend: (id: string) => void;
  getTrend: (id: string) => Trend | undefined;
  isLoading: boolean;
}

const TrendsContext = createContext<TrendsContextType | undefined>(undefined);

// ---- Mock fallback data (imported lazily) ----
let mockFallback: Trend[] | null = null;
async function getMockFallback(): Promise<Trend[]> {
  if (!mockFallback) {
    const mod = await import('../data/mock-trends');
    mockFallback = mod.mockTrends;
  }
  return mockFallback;
}

export function TrendsProvider({ children }: { children: ReactNode }) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const workspaceId = process.env.NEXT_PUBLIC_WORKSPACE_ID;
    if (!workspaceId) {
      getMockFallback().then(data => {
        setTrends(data);
        setIsLoading(false);
      });
      return;
    }

    fetch(`/api/trends?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.trends && data.trends.length > 0) {
          setTrends(apiTrendsToMockFormat(data.trends));
        } else {
          return getMockFallback().then(setTrends);
        }
      })
      .catch(err => {
        console.warn('[TrendsContext] API fetch failed, using mock data:', err.message);
        getMockFallback().then(setTrends);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const addTrend = (trend: Trend) => setTrends(prev => [...prev, trend]);
  const updateTrend = (id: string, trend: Trend) =>
    setTrends(prev => prev.map(t => (t.id === id ? trend : t)));
  const deleteTrend = (id: string) => setTrends(prev => prev.filter(t => t.id !== id));
  const getTrend = (id: string) => trends.find(t => t.id === id);

  return (
    <TrendsContext.Provider value={{ trends, addTrend, updateTrend, deleteTrend, getTrend, isLoading }}>
      {children}
    </TrendsContext.Provider>
  );
}

export function useTrendsContext() {
  const context = useContext(TrendsContext);
  if (!context) {
    throw new Error('useTrendsContext must be used within a TrendsProvider');
  }
  return context;
}
CTXEOF
echo "     ✓ Created"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Create KnowledgeContext.tsx
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 Creating KnowledgeContext.tsx"
cat > src/contexts/KnowledgeContext.tsx << 'CTXEOF'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Knowledge } from '../data/mock-knowledge';
import { apiKnowledgeToMockFormat } from '../lib/api/knowledge-adapter';

interface KnowledgeContextType {
  knowledge: Knowledge[];
  addKnowledge: (item: Knowledge) => void;
  updateKnowledge: (id: string, item: Knowledge) => void;
  deleteKnowledge: (id: string) => void;
  getKnowledge: (id: string) => Knowledge | undefined;
  isLoading: boolean;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

// ---- Mock fallback data (imported lazily) ----
let mockFallback: Knowledge[] | null = null;
async function getMockFallback(): Promise<Knowledge[]> {
  if (!mockFallback) {
    const mod = await import('../data/mock-knowledge');
    mockFallback = mod.mockKnowledge;
  }
  return mockFallback;
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const workspaceId = process.env.NEXT_PUBLIC_WORKSPACE_ID;
    if (!workspaceId) {
      getMockFallback().then(data => {
        setKnowledge(data);
        setIsLoading(false);
      });
      return;
    }

    fetch(`/api/knowledge?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.knowledge && data.knowledge.length > 0) {
          setKnowledge(apiKnowledgeToMockFormat(data.knowledge));
        } else {
          return getMockFallback().then(setKnowledge);
        }
      })
      .catch(err => {
        console.warn('[KnowledgeContext] API fetch failed, using mock data:', err.message);
        getMockFallback().then(setKnowledge);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const addKnowledge = (item: Knowledge) => setKnowledge(prev => [...prev, item]);
  const updateKnowledge = (id: string, item: Knowledge) =>
    setKnowledge(prev => prev.map(k => (k.id === id ? item : k)));
  const deleteKnowledge = (id: string) => setKnowledge(prev => prev.filter(k => k.id !== id));
  const getKnowledge = (id: string) => knowledge.find(k => k.id === id);

  return (
    <KnowledgeContext.Provider value={{ knowledge, addKnowledge, updateKnowledge, deleteKnowledge, getKnowledge, isLoading }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledgeContext() {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledgeContext must be used within a KnowledgeProvider');
  }
  return context;
}
CTXEOF
echo "     ✓ Created"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Register in AppProviders (contexts/index.tsx)
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 Registering in AppProviders"
FILE="src/contexts/index.tsx"

# Add imports after ProductsProvider import
if ! grep -q "TrendsProvider" "$FILE"; then
  sed -i '' "/import { ProductsProvider } from '.\/ProductsContext';/a\\
import { TrendsProvider } from './TrendsContext';\\
import { KnowledgeProvider } from './KnowledgeContext';
" "$FILE"
fi

# Wrap inside ProductsProvider
if ! grep -q "TrendsProvider" "$FILE"; then
  echo "     ⚠️  Already registered"
else
  # Add TrendsProvider + KnowledgeProvider inside the provider tree
  # Wrap around children of ProductsProvider
  sed -i '' 's|<ProductsProvider>|<ProductsProvider>\
              <TrendsProvider>\
              <KnowledgeProvider>|' "$FILE"
  sed -i '' 's|</ProductsProvider>|</KnowledgeProvider>\
              </TrendsProvider>\
              </ProductsProvider>|' "$FILE"
fi

# Add hook re-exports
if ! grep -q "useTrendsContext" "$FILE"; then
  sed -i '' "/export { useProducts } from '.\/ProductsContext';/a\\
export { useTrendsContext } from './TrendsContext';\\
export { useKnowledgeContext } from './KnowledgeContext';
" "$FILE"
fi

echo "     ✓ Registered"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Replace mockProducts in CampaignStrategyGeneratorDetail
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "=== Replacing mock imports in components ==="

echo "  📝 CampaignStrategyGeneratorDetail.tsx"
FILE="src/components/strategy-tools/CampaignStrategyGeneratorDetail.tsx"

# Remove mock imports
sed -i '' "/import { mockProducts } from '..\/..\/data\/mock-products';/d" "$FILE"
sed -i '' "/import { mockTrends } from '..\/..\/data\/mock-trends';/d" "$FILE"
sed -i '' "/import { mockKnowledge } from '..\/..\/data\/mock-knowledge';/d" "$FILE"

# Add context imports
if ! grep -q "useProducts" "$FILE"; then
  sed -i '' "/import { usePersonas }/a\\
import { useProducts } from '../../contexts/ProductsContext';
" "$FILE"
fi
if ! grep -q "useTrendsContext" "$FILE"; then
  sed -i '' "/import { useProducts }/a\\
import { useTrendsContext } from '../../contexts/TrendsContext';
" "$FILE"
fi
if ! grep -q "useKnowledgeContext" "$FILE"; then
  sed -i '' "/import { useTrendsContext }/a\\
import { useKnowledgeContext } from '../../contexts/KnowledgeContext';
" "$FILE"
fi

# Add hooks after usePersonas hook
if ! grep -q "const { products }" "$FILE"; then
  sed -i '' '/const { personas } = usePersonas();/a\
\  const { products } = useProducts();\
\  const { trends: trendsData } = useTrendsContext();\
\  const { knowledge } = useKnowledgeContext();
' "$FILE"
fi

# Replace mockProducts, mockTrends, mockKnowledge
sed -i '' 's/mockProducts/products/g' "$FILE"
# mockTrends → trendsData (because there's already a local `trends` state)
sed -i '' 's/useState(mockTrends)/useState(trendsData)/g' "$FILE"
sed -i '' 's/mockTrends/trendsData/g' "$FILE"
sed -i '' 's/mockKnowledge/knowledge/g' "$FILE"

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Replace in UniversalStrategyGenerator
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 UniversalStrategyGenerator.tsx"
FILE="src/components/strategy-tools/UniversalStrategyGenerator.tsx"

sed -i '' "/import { mockProducts } from '..\/..\/data\/mock-products';/d" "$FILE"
sed -i '' "/import { mockTrends } from '..\/..\/data\/mock-trends';/d" "$FILE"
sed -i '' "/import { mockKnowledge } from '..\/..\/data\/mock-knowledge';/d" "$FILE"

if ! grep -q "useProducts" "$FILE"; then
  sed -i '' "/import { usePersonas }/a\\
import { useProducts } from '../../contexts/ProductsContext';
" "$FILE"
fi
if ! grep -q "useTrendsContext" "$FILE"; then
  sed -i '' "/import { useProducts }/a\\
import { useTrendsContext } from '../../contexts/TrendsContext';
" "$FILE"
fi
if ! grep -q "useKnowledgeContext" "$FILE"; then
  sed -i '' "/import { useTrendsContext }/a\\
import { useKnowledgeContext } from '../../contexts/KnowledgeContext';
" "$FILE"
fi

if ! grep -q "const { products }" "$FILE"; then
  sed -i '' '/const { personas } = usePersonas();/a\
\  const { products } = useProducts();\
\  const { trends: trendsData } = useTrendsContext();\
\  const { knowledge } = useKnowledgeContext();
' "$FILE"
fi

sed -i '' 's/mockProducts/products/g' "$FILE"
sed -i '' 's/useState(mockTrends)/useState(trendsData)/g' "$FILE"
sed -i '' 's/mockTrends/trendsData/g' "$FILE"
sed -i '' 's/mockKnowledge/knowledge/g' "$FILE"

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Replace mockTrends in TrendLibrary.tsx
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 TrendLibrary.tsx"
FILE="src/components/TrendLibrary.tsx"

# Remove mock import (keep Trend type if separate)
sed -i '' "/import { mockTrends, Trend } from '..\/data\/mock-trends';/c\\
import { Trend } from '../data/mock-trends';\\
import { useTrendsContext } from '../contexts/TrendsContext';
" "$FILE"

# Find component function and add hook
# Check the component signature
COMP_LINE=$(grep -n "^export function\|^export default function\|^function TrendLibrary" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$COMP_LINE" ] && ! grep -q "useTrendsContext()" "$FILE"; then
  # Find first useState after component
  FIRST_STATE=$(awk -v start="$COMP_LINE" 'NR>start && /useState/{print NR; exit}' "$FILE")
  if [ -n "$FIRST_STATE" ]; then
    sed -i '' "${FIRST_STATE}i\\
\\  const { trends: trendsFromContext } = useTrendsContext();
" "$FILE"
  fi
fi

sed -i '' 's/mockTrends/trendsFromContext/g' "$FILE"

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 7. Replace mockTrends in ResourceDetailModal.tsx
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 ResourceDetailModal.tsx"
FILE="src/components/knowledge/ResourceDetailModal.tsx"

sed -i '' "/import { mockTrends } from '..\/..\/data\/mock-trends';/c\\
import { useTrendsContext } from '../../contexts/TrendsContext';
" "$FILE"

# Add hook inside component
COMP_LINE=$(grep -n "^export function\|^export default function\|^function ResourceDetailModal" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$COMP_LINE" ] && ! grep -q "useTrendsContext()" "$FILE"; then
  FIRST_LINE=$(awk -v start="$COMP_LINE" 'NR>start && /const |return /{print NR; exit}' "$FILE")
  if [ -n "$FIRST_LINE" ]; then
    sed -i '' "${FIRST_LINE}i\\
\\  const { trends: trendsFromContext } = useTrendsContext();
" "$FILE"
  fi
fi

sed -i '' 's/mockTrends/trendsFromContext/g' "$FILE"

echo "     ✓ Done"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────
echo "=== Verification ==="
echo "Remaining mockProducts:"
grep -rn "mockProducts" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' '
echo "Remaining mockTrends:"
grep -rn "mockTrends" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' '
echo "Remaining mockKnowledge (mock-knowledge only):"
grep -rn "mockKnowledge" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' '
echo ""
echo "TS errors:"
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"
echo ""
echo "✅ Done!"
echo "  git add -A && git commit -m 'refactor: create TrendsContext + KnowledgeContext, replace mockProducts/mockTrends/mockKnowledge'"
