import React, { useState } from 'react';
import { BrandstyleAnalyzer, BrandStyleData } from './BrandstyleAnalyzer';
import { StyleGuideViewer } from './StyleGuideViewer';

export function BrandstyleView() {
  const [analyzedData, setAnalyzedData] = useState<BrandStyleData | null>(null);

  const handleAnalysisComplete = (data: BrandStyleData) => {
    setAnalyzedData(data);
  };

  const handleBack = () => {
    setAnalyzedData(null);
  };

  if (analyzedData) {
    return <StyleGuideViewer styleData={analyzedData} onBack={handleBack} />;
  }

  return <BrandstyleAnalyzer onAnalysisComplete={handleAnalysisComplete} />;
}
