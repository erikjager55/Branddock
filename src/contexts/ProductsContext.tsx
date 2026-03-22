import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductServiceData } from '../types/product';
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

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
  const [products, setProducts] = useState<ProductServiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      })
      .catch((err) => {
        console.warn('[ProductsContext] API fetch failed:', err.message);
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
