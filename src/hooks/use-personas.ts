import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPersonas, createPersona } from "@/lib/api/personas";
import type { CreatePersonaBody } from "@/types/persona";
import type { PersonaListResponse } from "@/lib/api/personas";

export const personaKeys = {
  all: ["personas"] as const,
  list: (workspaceId: string) => ["personas", "list", workspaceId] as const,
};

export function usePersonasQuery(workspaceId: string | undefined) {
  return useQuery<PersonaListResponse>({
    queryKey: personaKeys.list(workspaceId ?? ""),
    queryFn: () => fetchPersonas(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreatePersona(workspaceId: string, createdById: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonaBody) =>
      createPersona(workspaceId, createdById, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personaKeys.all });
    },
  });
}
