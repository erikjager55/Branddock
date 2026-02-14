import { Bundle } from '../types/brand-asset';

export const mockBundles: Bundle[] = [
  {
    id: 'bundle-essentials',
    name: 'Essentials Bundle',
    type: 'essentials',
    description: 'Foundation brand assets to get started',
    includedAssets: ['1', '2', '3'], // Golden Circle, Vision, Core Values
    color: '#3b82f6' // Blue
  },
  {
    id: 'bundle-professional',
    name: 'Professional Bundle',
    type: 'professional',
    description: 'Comprehensive brand strategy assets',
    includedAssets: ['1', '2', '3', '4', '5', '6'], // All strategy assets
    color: '#8b5cf6' // Purple
  },
  {
    id: 'bundle-enterprise',
    name: 'Enterprise Bundle',
    type: 'enterprise',
    description: 'Complete brand asset collection',
    includedAssets: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], // All assets
    color: '#f59e0b' // Amber
  }
];

// Current active bundle for the user
export const currentBundle: Bundle = mockBundles[1]; // Professional Bundle
