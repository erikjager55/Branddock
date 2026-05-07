import { useQuery } from '@tanstack/react-query';
import {
  fetchVisualFidelityDashboard,
  type VisualFidelityDashboardData,
} from '../api/visual-fidelity.api';

export const visualFidelityKeys = {
  all: ['visual-fidelity'] as const,
  dashboard: () => [...visualFidelityKeys.all, 'dashboard'] as const,
};

export function useVisualFidelityDashboard() {
  return useQuery<VisualFidelityDashboardData>({
    queryKey: visualFidelityKeys.dashboard(),
    queryFn: fetchVisualFidelityDashboard,
    staleTime: 60_000,
  });
}
