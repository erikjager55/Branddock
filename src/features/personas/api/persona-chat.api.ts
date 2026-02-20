import type { ChatSession, ChatInsight, ChatMessage } from "../types/persona-chat.types";

const BASE = "/api/personas";

export async function startChatSession(
  personaId: string,
  mode?: string,
): Promise<{ sessionId: string; messages: ChatMessage[] }> {
  const res = await fetch(`${BASE}/${personaId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: mode ?? "FREE_CHAT" }),
  });
  if (!res.ok) throw new Error("Failed to start chat session");
  return res.json();
}

export async function sendChatMessage(
  personaId: string,
  sessionId: string,
  content: string,
): Promise<{ reply: ChatMessage; insights?: ChatInsight[] }> {
  const res = await fetch(`${BASE}/${personaId}/chat/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to send chat message");
  return res.json();
}

// ─── Streaming Chat ─────────────────────────────────────────

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, usage: { promptTokens: number; completionTokens: number }) => void;
  onMeta: (meta: { messageId: string; userMessageId: string; sessionId: string }) => void;
  onError: (error: string) => void;
}

/**
 * Send a chat message via the streaming endpoint.
 * Consumes SSE events and calls the appropriate callbacks.
 */
export async function streamChatMessage(
  personaId: string,
  sessionId: string,
  message: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${BASE}/${personaId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to send message" }));
    callbacks.onError(err.error || "Failed to send message");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response stream");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // Keep incomplete last line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      try {
        const payload = JSON.parse(trimmed.slice(6));

        if (payload.error) {
          callbacks.onError(payload.error);
        } else if (payload.meta) {
          callbacks.onMeta({
            messageId: payload.messageId,
            userMessageId: payload.userMessageId,
            sessionId: payload.sessionId,
          });
        } else if (payload.done) {
          callbacks.onDone(payload.fullText, {
            promptTokens: payload.usage?.promptTokens ?? 0,
            completionTokens: payload.usage?.completionTokens ?? 0,
          });
        } else if (payload.token !== undefined) {
          callbacks.onToken(payload.token);
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
}

export async function fetchChatInsights(
  personaId: string,
  sessionId: string,
): Promise<{ insights: ChatInsight[] }> {
  const res = await fetch(`${BASE}/${personaId}/chat/${sessionId}/insights`);
  if (!res.ok) throw new Error("Failed to fetch chat insights");
  return res.json();
}

export async function generateInsight(
  personaId: string,
  sessionId: string,
  messageId: string,
): Promise<ChatInsight> {
  const res = await fetch(`${BASE}/${personaId}/chat/${sessionId}/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to generate insight" }));
    throw new Error(err.error || "Failed to generate insight");
  }
  return res.json();
}

export async function deleteInsight(
  personaId: string,
  sessionId: string,
  insightId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/${personaId}/chat/${sessionId}/insights?insightId=${insightId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete insight");
}

// ─── Context API ────────────────────────────────────────────

export interface AvailableContextGroupItem {
  sourceType: string;
  sourceId: string;
  title: string;
  description?: string;
  status?: string;
}

export interface AvailableContextGroup {
  key: string;
  label: string;
  icon: string;
  category: string;
  items: AvailableContextGroupItem[];
}

export interface AvailableContextResponse {
  groups: AvailableContextGroup[];
}

export interface SessionContextItem {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  createdAt: string;
}

export async function fetchAvailableContext(
  personaId: string,
): Promise<AvailableContextResponse> {
  const res = await fetch(`${BASE}/${personaId}/chat/context-available`);
  if (!res.ok) throw new Error("Failed to fetch available context");
  return res.json();
}

export async function fetchSessionContext(
  personaId: string,
  sessionId: string,
): Promise<{ items: SessionContextItem[] }> {
  const res = await fetch(`${BASE}/${personaId}/chat/${sessionId}/context`);
  if (!res.ok) throw new Error("Failed to fetch session context");
  return res.json();
}

export async function saveSessionContext(
  personaId: string,
  sessionId: string,
  items: Array<{ sourceType: string; sourceId: string }>,
): Promise<{ items: Array<{ id: string; sourceType: string; sourceId: string; sourceName: string }> }> {
  const res = await fetch(`${BASE}/${personaId}/chat/${sessionId}/context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Failed to save session context");
  return res.json();
}

export async function removeSessionContext(
  personaId: string,
  sessionId: string,
  contextId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/${personaId}/chat/${sessionId}/context?contextId=${contextId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to remove session context");
}

export type { ChatSession };
