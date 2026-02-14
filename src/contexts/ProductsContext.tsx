import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProductServiceData } from '../components/ProductServiceAnalyzer';

interface ProductsContextType {
  products: ProductServiceData[];
  addProduct: (product: ProductServiceData) => void;
  updateProduct: (id: string, product: ProductServiceData) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => ProductServiceData | undefined;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProductServiceData[]>([
    // Mock data for demo purposes
    {
      id: 'product-1',
      source: 'Manual Entry',
      name: 'Digital Platform Suite',
      description: 'Comprehensive digital platform solution with AI-powered analytics, user management, and custom integrations for modern enterprises.',
      category: 'Software',
      pricing: {
        model: 'Enterprise',
      },
      features: [
        'AI-powered Analytics Dashboard',
        'Custom API Integrations',
        'Advanced User Management',
        'Real-time Data Processing',
        'Cloud-based Infrastructure'
      ],
      benefits: [
        'Reduce operational costs by 40%',
        'Increase team productivity',
        'Make data-driven decisions faster',
        'Scalable for growth'
      ],
      useCases: [
        'Enterprise Resource Planning',
        'Customer Data Management',
        'Business Intelligence & Reporting',
        'Team Collaboration'
      ],
    },
    {
      id: 'product-2',
      source: 'Manual Entry',
      name: 'Brand Strategy Consulting',
      description: 'End-to-end brand strategy development including market research, competitive analysis, positioning, and implementation roadmap with ongoing support.',
      category: 'Consulting',
      pricing: {
        model: 'Custom',
      },
      features: [
        'In-depth Market Research',
        'Competitive Analysis',
        'Brand Positioning Workshop',
        'Implementation Roadmap',
        '6 months ongoing support'
      ],
      benefits: [
        'Clear brand differentiation',
        'Stronger market position',
        'Improved customer recognition',
        'Strategic clarity for leadership'
      ],
      useCases: [
        'Brand Repositioning',
        'Market Entry Strategy',
        'Brand Refresh',
        'Merger & Acquisition Branding'
      ],
    },
    {
      id: 'product-3',
      source: 'Manual Entry',
      name: 'Mobile App Framework',
      description: 'Cross-platform mobile application framework with built-in security features, offline capabilities, cloud synchronization, and enterprise-grade support.',
      category: 'Mobile',
      pricing: {
        model: 'Subscription',
        amount: '€149/month',
      },
      features: [
        'Cross-platform Development (iOS & Android)',
        'Offline-first Architecture',
        'Automatic Cloud Sync',
        'Enterprise Security (SSL, Encryption)',
        'Push Notifications'
      ],
      benefits: [
        'Faster time to market',
        'Reduced development costs',
        'Single codebase maintenance',
        'Native-like performance'
      ],
      useCases: [
        'Enterprise Mobile Apps',
        'Field Service Applications',
        'Customer-facing Apps',
        'Internal Communication Tools'
      ],
    }
  ]);

  const addProduct = (product: ProductServiceData) => {
    const newProduct = {
      ...product,
      id: `product-${Date.now()}`,
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updatedProduct: ProductServiceData) => {
    setProducts(prev => 
      prev.map(p => p.id === id ? { ...updatedProduct, id } : p)
    );
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const getProduct = (id: string) => {
    return products.find(p => p.id === id);
  };

  return (
    <ProductsContext.Provider value={{
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      getProduct,
    }}>
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
