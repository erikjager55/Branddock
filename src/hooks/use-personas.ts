import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPersonas, createPersona } from "@/lib/api/personas";
import type { CreatePersonaBody } from "@/types/persona";
import type { PersonaListResponse } from "@/lib/api/personas";

export const personaKeys = {
  all: ["personas"] as const,
  list: (workspaceId: string) => ["personas", "list", workspaceId] as const,
};

/**
 * Hook: fetch personas. workspaceId is only used as cache key;
 * server resolves workspace via session cookie.
 */
export function usePersonasQuery(workspaceId: string | undefined) {
  return useQuery<PersonaListResponse>({
    queryKey: personaKeys.list(workspaceId ?? ""),
    queryFn: () => fetchPersonas(),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreatePersona() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonaBody & { createdById?: string }) =>
      createPersona(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personaKeys.all });
    },
  });
}
