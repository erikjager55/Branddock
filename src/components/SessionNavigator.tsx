import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  PlayCircle,
  Home,
  Target
} from 'lucide-react';
import { BrandAsset, ResearchMethodType } from '../types/brand-asset';

interface SessionNavigatorProps {
  currentAssetId: string;
  currentMethodType: ResearchMethodType;
  allAssets: BrandAsset[];
  onNavigateToAsset: (assetId: string) => void;
  onReturnToHub: () => void;
}

export function SessionNavigator({
  currentAssetId,
  currentMethodType,
  allAssets,
  onNavigateToAsset,
  onReturnToHub
}: SessionNavigatorProps) {
  // SessionNavigator is disabled
  return null;
}