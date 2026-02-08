import { create } from "zustand";
import type { User, Workspace } from "@/types";

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  workspace: null,
  setUser: (user) => set({ user }),
  setWorkspace: (workspace) => set({ workspace }),
  logout: () => set({ user: null, workspace: null }),
}));
