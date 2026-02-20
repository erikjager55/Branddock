import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductServiceData } from '../components/ProductServiceAnalyzer';
import { apiProductsToMockFormat } from '../lib/api/product-adapter';
import {
  fetchProductPersonas,
  linkPersona,
  unlinkPersona,
  type ProductPersonaLink,
} from '../lib/api/products';
import { useWorkspace } from '../hooks/use-workspace';

interface ProductsContextType {
  products: ProductServiceData[];
  addProduct: (product: ProductServiceData) => void;
  updateProduct: (id: string, product: ProductServiceData) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => ProductServiceData | undefined;
  isLoading: boolean;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

// ---- Mock fallback data ----
const MOCK_PRODUCTS: ProductServiceData[] = [
  {
    id: 'product-1',
    source: 'Manual Entry',
    name: 'Digital Platform Suite',
    description: 'Comprehensive digital platform solution with AI-powered analytics, user management, and custom integrations for modern enterprises.',
    category: 'Software',
    pricing: { model: 'Enterprise' },
    features: [
      'AI-powered Analytics Dashboard',
      'Custom API Integrations',
      'Advanced User Management',
      'Real-time Data Processing',
      'Cloud-based Infrastructure',
    ],
    benefits: [
      'Reduce operational costs by 40%',
      'Increase team productivity',
      'Make data-driven decisions faster',
      'Scalable for growth',
    ],
    useCases: [
      'Enterprise Resource Planning',
      'Customer Data Management',
      'Business Intelligence & Reporting',
      'Team Collaboration',
    ],
  },
  {
    id: 'product-2',
    source: 'Manual Entry',
    name: 'Brand Strategy Consulting',
    description: 'End-to-end brand strategy development including market research, competitive analysis, positioning, and implementation roadmap with ongoing support.',
    category: 'Consulting',
    pricing: { model: 'Custom' },
    features: [
      'In-depth Market Research',
      'Competitive Analysis',
      'Brand Positioning Workshop',
      'Implementation Roadmap',
      '6 months ongoing support',
    ],
    benefits: [
      'Clear brand differentiation',
      'Stronger market position',
      'Improved customer recognition',
      'Strategic clarity for leadership',
    ],
    useCases: [
      'Brand Repositioning',
      'Market Entry Strategy',
      'Brand Refresh',
      'Merger & Acquisition Branding',
    ],
  },
  {
    id: 'product-3',
    source: 'Manual Entry',
    name: 'Mobile App Framework',
    description: 'Cross-platform mobile application framework with built-in security features, offline capabilities, cloud synchronization, and enterprise-grade support.',
    category: 'Mobile',
    pricing: { model: 'Subscription', amount: '€149/month' },
    features: [
      'Cross-platform Development (iOS & Android)',
      'Offline-first Architecture',
      'Automatic Cloud Sync',
      'Enterprise Security (SSL, Encryption)',
      'Push Notifications',
    ],
    benefits: [
      'Faster time to market',
      'Reduced development costs',
      'Single codebase maintenance',
      'Native-like performance',
    ],
    useCases: [
      'Enterprise Mobile Apps',
      'Field Service Applications',
      'Customer-facing Apps',
      'Internal Communication Tools',
    ],
  },
];

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
  const [products, setProducts] = useState<ProductServiceData[]>(MOCK_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);

  // Try API first, fallback to mock data
  useEffect(() => {
    if (wsLoading) return;

    if (!workspaceId) {
      setIsLoading(false);
      return;
    }

    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.products && data.products.length > 0) {
          setProducts(apiProductsToMockFormat(data.products));
        }
        // If API returns empty, keep mock data
      })
      .catch((err) => {
        console.warn('[ProductsContext] API fetch failed, using mock data:', err.message);
      })
      .finally(() => setIsLoading(false));
  }, [workspaceId, wsLoading]);

  const addProduct = (product: ProductServiceData) => {
    const newProduct = {
      ...product,
      id: `product-${Date.now()}`,
    };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updatedProduct: ProductServiceData) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...updatedProduct, id } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const getProduct = (id: string) => {
    return products.find((p) => p.id === id);
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        isLoading,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}

// =============================================================
// TanStack Query hooks for ProductPersona
// =============================================================

const productPersonaKeys = {
  all: ['product-personas'] as const,
  list: (productId: string) => ['product-personas', productId] as const,
};

/**
 * Hook: fetch personas linked to a product.
 */
export function useProductPersonas(productId: string | undefined) {
  return useQuery<{ personas: ProductPersonaLink[] }>({
    queryKey: productPersonaKeys.list(productId ?? ''),
    queryFn: () => fetchProductPersonas(productId!),
    enabled: !!productId,
    staleTime: 30_000,
  });
}

/**
 * Mutation: link a persona to a product.
 */
export function useLinkPersona() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, personaId }: {
      productId: string;
      personaId: string;
    }) => linkPersona(productId, personaId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productPersonaKeys.list(variables.productId) });
    },
  });
}

/**
 * Mutation: unlink a persona from a product.
 */
export function useUnlinkPersona() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, personaId }: { productId: string; personaId: string }) =>
      unlinkPersona(productId, personaId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productPersonaKeys.list(variables.productId) });
    },
  });
}
