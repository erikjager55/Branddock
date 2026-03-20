import { create } from 'zustand';
import type { ScanViewState } from '../types/website-scanner.types';

interface WebsiteScannerState {
  // View state
  viewState: ScanViewState;
  setViewState: (state: ScanViewState) => void;

  // URL input
  url: string;
  setUrl: (url: string) => void;

  // Scan job
  jobId: string | null;
  setJobId: (id: string | null) => void;

  // Apply modal
  isApplyModalOpen: boolean;
  openApplyModal: () => void;
  closeApplyModal: () => void;

  // Reset
  reset: () => void;
}

const INITIAL_STATE = {
  viewState: 'input' as ScanViewState,
  url: '',
  jobId: null as string | null,
  isApplyModalOpen: false,
};

export const useWebsiteScannerStore = create<WebsiteScannerState>((set) => ({
  ...INITIAL_STATE,
  setViewState: (viewState) => set({ viewState }),
  setUrl: (url) => set({ url }),
  setJobId: (jobId) => set({ jobId }),
  openApplyModal: () => set({ isApplyModalOpen: true }),
  closeApplyModal: () => set({ isApplyModalOpen: false }),
  reset: () => set(INITIAL_STATE),
}));
