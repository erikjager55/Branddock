import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Trend } from '../types/trend';
import { apiTrendsToMockFormat } from '../lib/api/trend-adapter';
import { useWorkspace } from '../hooks/use-workspace';

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
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (wsLoading) return;

    if (!workspaceId) {
      getMockFallback().then(data => {
        setTrends(data);
        setIsLoading(false);
      });
      return;
    }

    fetch('/api/trends')
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
  }, [workspaceId, wsLoading]);

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
