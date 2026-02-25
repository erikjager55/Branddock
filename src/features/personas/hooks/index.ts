import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/personas.api";
import * as chatApi from "../api/persona-chat.api";
import * as analysisApi from "../api/persona-analysis.api";
import type { CreatePersonaBody, UpdatePersonaBody } from "../types/persona.types";

// ─── Query Keys ────────────────────────────────────────────

export const personaKeys = {
  all: ["personas"] as const,
  list: () => [...personaKeys.all, "list"] as const,
  detail: (id: string) => [...personaKeys.all, "detail", id] as const,
  chatSession: (id: string, sid: string) =>
    [...personaKeys.all, id, "chat", sid] as const,
  chatInsights: (id: string, sid: string) =>
    [...personaKeys.all, id, "chat", sid, "insights"] as const,
  chatContext: (id: string, sid: string) =>
    [...personaKeys.all, id, "chat", sid, "context"] as const,
  availableContext: (id: string) =>
    [...personaKeys.all, id, "chat", "available-context"] as const,
  analysisSession: (id: string, sid: string) =>
    [...personaKeys.all, id, "analysis", sid] as const,
};

// ─── 1. usePersonas ────────────────────────────────────────

export function usePersonas(search?: string, filter?: string) {
  return useQuery({
    queryKey: [...personaKeys.list(), search, filter] as const,
    queryFn: () => api.fetchPersonas(search, filter),
    staleTime: 30_000,
  });
}

// ─── 2. usePersonaDetail ───────────────────────────────────

export function usePersonaDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: personaKeys.detail(id ?? ""),
    queryFn: () => api.fetchPersonaDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── 3. useCreatePersona ───────────────────────────────────

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePersonaBody) => api.createPersona(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.list() });
    },
  });
}

// ─── 4. useUpdatePersona ───────────────────────────────────

export function useUpdatePersona(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePersonaBody) => api.updatePersona(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: personaKeys.list() });
      // Invalidate version history so VersionHistoryCard picks up new version
      qc.invalidateQueries({ queryKey: ['versions', 'PERSONA', id!] });
    },
  });
}

// ─── 5. useDeletePersona ───────────────────────────────────

export function useDeletePersona(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deletePersona(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.list() });
    },
  });
}

// ─── 6. useDuplicatePersona ────────────────────────────────

export function useDuplicatePersona(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.duplicatePersona(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.list() });
    },
  });
}

// ─── 7. useTogglePersonaLock ───────────────────────────────

export function useTogglePersonaLock(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) => api.togglePersonaLock(id!, locked),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: personaKeys.list() });
    },
  });
}

// ─── 8. useUpdateResearchMethod ────────────────────────────

export function useUpdateResearchMethod(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { method: string; status: string; progress?: number }) =>
      api.updateResearchMethod(id!, data.method, {
        status: data.status,
        progress: data.progress,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: personaKeys.list() });
    },
  });
}

// ─── 9. useGeneratePersonaImage ────────────────────────────

export function useGeneratePersonaImage(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.generatePersonaImage(id!),
    onSuccess: (data) => {
      // Cache-bust: add timestamp to HTTP URLs only (NOT data: URIs)
      const newUrl = data.avatarUrl.startsWith('data:')
        ? data.avatarUrl
        : data.avatarUrl.includes('?')
          ? `${data.avatarUrl}&_t=${Date.now()}`
          : `${data.avatarUrl}?_t=${Date.now()}`;

      // Directly patch the cached persona — no refetch needed
      qc.setQueryData(personaKeys.detail(id!), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const rec = old as Record<string, unknown>;
        if (rec.persona && typeof rec.persona === 'object') {
          return { ...rec, persona: { ...(rec.persona as Record<string, unknown>), avatarUrl: newUrl } };
        }
        return { ...rec, avatarUrl: newUrl };
      });

      // Invalidate list so overview cards pick up new avatar
      qc.invalidateQueries({ queryKey: personaKeys.list() });
      // Invalidate version history (avatar change creates a version)
      qc.invalidateQueries({ queryKey: ['versions', 'PERSONA', id!] });
    },
  });
}

// ─── 10. useGenerateImplications ───────────────────────────

export function useGenerateImplications(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.generateStrategicImplications(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.detail(id!) });
    },
  });
}

// ─── 11. useStartChatSession ───────────────────────────────

export function useStartChatSession(personaId: string | undefined) {
  return useMutation({
    mutationFn: (mode?: string) => chatApi.startChatSession(personaId!, mode),
  });
}

// ─── 12. useSendChatMessage ────────────────────────────────

export function useSendChatMessage(
  personaId: string | undefined,
  sessionId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      chatApi.sendChatMessage(personaId!, sessionId!, content),
    onSuccess: () => {
      if (personaId && sessionId) {
        qc.invalidateQueries({
          queryKey: personaKeys.chatInsights(personaId, sessionId),
        });
      }
    },
  });
}

// ─── 13. useChatInsights ───────────────────────────────────

export function useChatInsights(
  personaId: string | undefined,
  sessionId: string | null,
) {
  return useQuery({
    queryKey: personaKeys.chatInsights(personaId ?? "", sessionId ?? ""),
    queryFn: () => chatApi.fetchChatInsights(personaId!, sessionId!),
    enabled: !!personaId && !!sessionId,
    staleTime: 10_000,
  });
}

// ─── 13b. useGenerateInsight ──────────────────────────────

export function useGenerateInsight(
  personaId: string | undefined,
  sessionId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      chatApi.generateInsight(personaId!, sessionId!, messageId),
    onSuccess: () => {
      if (personaId && sessionId) {
        qc.invalidateQueries({
          queryKey: personaKeys.chatInsights(personaId, sessionId),
        });
      }
    },
  });
}

// ─── 13c. useDeleteInsight ────────────────────────────────

export function useDeleteInsight(
  personaId: string | undefined,
  sessionId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (insightId: string) =>
      chatApi.deleteInsight(personaId!, sessionId!, insightId),
    onSuccess: () => {
      if (personaId && sessionId) {
        qc.invalidateQueries({
          queryKey: personaKeys.chatInsights(personaId, sessionId),
        });
      }
    },
  });
}

// ─── 14. useStartAnalysisSession ───────────────────────────

export function useStartAnalysisSession(personaId: string | undefined) {
  return useMutation({
    mutationFn: () => analysisApi.startAnalysisSession(personaId!),
  });
}

// ─── 15. useAnalysisSession ────────────────────────────────

export function useAnalysisSession(
  personaId: string | undefined,
  sessionId: string | null,
) {
  return useQuery({
    queryKey: personaKeys.analysisSession(personaId ?? "", sessionId ?? ""),
    queryFn: () => analysisApi.fetchAnalysisSession(personaId!, sessionId!),
    enabled: !!personaId && !!sessionId,
    staleTime: 10_000,
  });
}

// ─── 16. useSendAnalysisAnswer ─────────────────────────────

export function useSendAnalysisAnswer(
  personaId: string | undefined,
  sessionId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      analysisApi.sendAnalysisAnswer(personaId!, sessionId!, content),
    onSuccess: () => {
      if (personaId && sessionId) {
        qc.invalidateQueries({
          queryKey: personaKeys.analysisSession(personaId, sessionId),
        });
      }
    },
  });
}

// ─── 17. useCompleteAnalysis ───────────────────────────────

export function useCompleteAnalysis(
  personaId: string | undefined,
  sessionId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      analysisApi.completeAnalysis(personaId!, sessionId!),
    onSuccess: () => {
      if (personaId && sessionId) {
        qc.invalidateQueries({
          queryKey: personaKeys.analysisSession(personaId, sessionId),
        });
      }
      if (personaId) {
        qc.invalidateQueries({ queryKey: personaKeys.detail(personaId) });
        qc.invalidateQueries({ queryKey: personaKeys.list() });
      }
    },
  });
}

// ─── 18. useAvailableContext ──────────────────────────────

export function useAvailableContext(personaId: string | undefined) {
  return useQuery({
    queryKey: personaKeys.availableContext(personaId ?? ""),
    queryFn: () => chatApi.fetchAvailableContext(personaId!),
    enabled: !!personaId,
    staleTime: 30_000,
  });
}

// ─── 19. useSessionContext ───────────────────────────────

export function useSessionContext(
  personaId: string | undefined,
  sessionId: string | null,
) {
  return useQuery({
    queryKey: personaKeys.chatContext(personaId ?? "", sessionId ?? ""),
    queryFn: () => chatApi.fetchSessionContext(personaId!, sessionId!),
    enabled: !!personaId && !!sessionId,
    staleTime: 10_000,
  });
}

// ─── 20. useSaveContext ──────────────────────────────────

export function useSaveContext(
  personaId: string | undefined,
  sessionId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ sourceType: string; sourceId: string }>) =>
      chatApi.saveSessionContext(personaId!, sessionId!, items),
    onSuccess: () => {
      if (personaId && sessionId) {
        qc.invalidateQueries({
          queryKey: personaKeys.chatContext(personaId, sessionId),
        });
      }
    },
  });
}

// ─── 21. useRemoveContext ────────────────────────────────

export function useRemoveContext(
  personaId: string | undefined,
  sessionId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contextId: string) =>
      chatApi.removeSessionContext(personaId!, sessionId!, contextId),
    onSuccess: () => {
      if (personaId && sessionId) {
        qc.invalidateQueries({
          queryKey: personaKeys.chatContext(personaId, sessionId),
        });
      }
    },
  });
}

// ─── 22. useRestorePersonaVersion ──────────────────────────

export function useRestorePersonaVersion(personaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => api.restorePersonaVersion(personaId!, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: personaKeys.detail(personaId!) });
      qc.invalidateQueries({ queryKey: personaKeys.list() });
      // Also invalidate generic version history used by VersionPill
      qc.invalidateQueries({ queryKey: ['versions', 'PERSONA', personaId!] });
    },
  });
}
