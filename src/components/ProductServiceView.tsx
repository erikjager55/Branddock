import React, { useState } from 'react';
import { ProductServiceAnalyzer, ProductServiceData } from './ProductServiceAnalyzer';
import { ProductServiceViewer } from './ProductServiceViewer';
import { useProducts } from '../contexts';

interface ProductServiceViewProps {
  productId?: string;
  onBack?: () => void;
}

export function ProductServiceView({ productId, onBack }: ProductServiceViewProps) {
  const { products, addProduct, updateProduct, getProduct } = useProducts();
  const [showAnalyzer, setShowAnalyzer] = useState(!productId);

  // If productId is provided, show the viewer directly
  if (productId) {
    const product = getProduct(productId);
    if (!product) {
      // Product not found, go back
      onBack?.();
      return null;
    }

    return (
      <ProductServiceViewer
        data={product}
        onBack={() => onBack?.()}
        onSave={(updatedData) => {
          updateProduct(productId, updatedData);
        }}
      />
    );
  }

  // Otherwise, show analyzer flow
  const handleAnalysisComplete = (data: ProductServiceData) => {
    addProduct(data);
    setShowAnalyzer(false);
  };

  const handleBackToAnalyzer = () => {
    setShowAnalyzer(true);
  };

  return <ProductServiceAnalyzer onAnalysisComplete={handleAnalysisComplete} />;
}