"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberInput,
} from "@/lib/validations/workspace";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  createdAt: string;
  updatedAt: string;
  members?: WorkspaceMember[];
}

export interface WorkspaceMember {
  id: string;
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
  joinedAt: string;
  userId: string;
  workspaceId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function useWorkspace() {
  return useQuery({
    queryKey: ["workspace"],
    queryFn: () => api.get<Workspace>("/api/workspace"),
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWorkspaceInput) =>
      api.patch<Workspace>("/api/workspace", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
  });
}

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: ["workspace", "members"],
    queryFn: () => api.get<WorkspaceMember[]>("/api/workspace/members"),
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberInput) =>
      api.post<WorkspaceMember>("/api/workspace/members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "members"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateMemberInput) =>
      api.patch<WorkspaceMember>(`/api/workspace/members/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "members"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/workspace/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "members"] });
    },
  });
}
