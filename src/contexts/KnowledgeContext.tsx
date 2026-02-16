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
