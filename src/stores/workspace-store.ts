import { create } from "zustand";
import type { Workspace, WorkspaceMember } from "@/types";

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setMembers: (members: WorkspaceMember[]) => void;
  addMember: (member: WorkspaceMember) => void;
  removeMember: (memberId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  currentWorkspace: null,
  members: [],
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setMembers: (members) => set({ members }),
  addMember: (member) =>
    set((state) => ({ members: [...state.members, member] })),
  removeMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    })),
}));
