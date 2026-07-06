import { create } from 'zustand';

/**
 * Agents UI-state — selectie voor de App.tsx detail-case (patroon
 * useCompetitorsStore.selectedCompetitorId) + inbox-focus zodat
 * "Bekijk in inbox" de betreffende run opengeklapt toont.
 */
interface AgentsStore {
  /** Agent-id voor de `agent-detail`-case; null → redirect naar catalogus. */
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;

  /** Run die de inbox bij openen moet focussen/uitklappen (one-shot). */
  inboxFocusRunId: string | null;
  setInboxFocusRunId: (id: string | null) => void;
}

export const useAgentsStore = create<AgentsStore>((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),

  inboxFocusRunId: null,
  setInboxFocusRunId: (id) => set({ inboxFocusRunId: id }),
}));
