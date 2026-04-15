import { z } from 'zod';

// ─── Messages ────────────────────────────────────────────────

export type ClawMessageRole = 'user' | 'assistant' | 'tool_result';

export interface ClawMessage {
  id: string;
  role: ClawMessageRole;
  content: string;
  /** Tool calls made by the assistant in this message */
  toolCalls?: ClawToolCall[];
  /** Results from tool executions */
  toolResults?: ClawToolResult[];
  /** Pending mutation awaiting user confirmation */
  pendingMutation?: MutationProposal | null;
  /** Attachments added by the user to this message */
  attachments?: ClawAttachment[];
  createdAt: string; // ISO timestamp
}

// ─── Tool Use ────────────────────────────────────────────────

export interface ClawToolCall {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface ClawToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

export interface MutationProposal {
  toolCallId: string;
  toolName: string;
  params: Record<string, unknown>;
  description: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  /** Before/after preview for the user */
  changes?: MutationChange[];
}

export interface MutationChange {
  field: string;
  label: string;
  currentValue: string | null;
  proposedValue: string;
}

// ─── Tool Definition ─────────────────────────────────────────

export interface ClawToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  /** If true, shows MutationConfirmCard before executing */
  requiresConfirmation: boolean;
  /** Category for grouping in documentation */
  category: 'read' | 'write' | 'analyze' | 'navigate';
  /** Execute the tool server-side, returns result for Claude */
  execute: (
    params: Record<string, unknown>,
    ctx: ToolExecutionContext
  ) => Promise<unknown>;
  /** Build a MutationProposal preview (write tools only) */
  buildProposal?: (
    params: Record<string, unknown>,
    ctx: ToolExecutionContext
  ) => Promise<MutationProposal>;
}

export interface ToolExecutionContext {
  workspaceId: string;
  userId: string;
}

// ─── Context Selection ───────────────────────────────────────

export interface ContextSelection {
  modules: ContextModule[];
  /** Specific entity IDs per module (if empty, all entities are included) */
  entityIds?: Partial<Record<ContextModule, string[]>>;
}

export type ContextModule =
  | 'brand_assets'
  | 'brandstyle'
  | 'personas'
  | 'products'
  | 'competitors'
  | 'trends'
  | 'strategies'
  | 'campaigns'
  | 'alignment'
  | 'knowledge'
  | 'dashboard';

export const ALL_CONTEXT_MODULES: ContextModule[] = [
  'brand_assets',
  'brandstyle',
  'personas',
  'products',
  'competitors',
  'trends',
  'strategies',
  'campaigns',
  'alignment',
  'knowledge',
  'dashboard',
];

export const DEFAULT_CONTEXT_MODULES: ContextModule[] = [
  'brand_assets',
  'brandstyle',
  'personas',
];

// ─── Attachments ─────────────────────────────────────────────

export type ClawAttachmentType = 'text' | 'file' | 'url';

export interface ClawAttachment {
  id: string;
  type: ClawAttachmentType;
  /** Display name (file name, URL, or "Pasted text") */
  label: string;
  /** Extracted/parsed text content sent to Claude */
  content: string;
  /** Original file metadata (for file attachments) */
  fileMeta?: {
    name: string;
    size: number;
    mimeType: string;
  };
  /** Original URL (for url attachments) */
  sourceUrl?: string;
}

// ─── Conversations ───────────────────────────────────────────

export interface ClawConversationMeta {
  id: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string; // ISO timestamp
  createdAt: string;
}

export interface ClawConversationFull {
  id: string;
  title: string | null;
  messages: ClawMessage[];
  contextSelection: ContextSelection | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Request/Response ────────────────────────────────────

export interface ClawChatRequest {
  conversationId?: string;
  message: string;
  contextSelection: ContextSelection;
  attachments?: ClawAttachment[];
}

export interface ClawConfirmRequest {
  conversationId: string;
  toolCallId: string;
  approved: boolean;
  /** User-edited values (if they clicked Edit before Apply) */
  editedParams?: Record<string, unknown>;
}

// ─── SSE Event Types ─────────────────────────────────────────

export type ClawSSEEventType =
  | 'text_delta'        // Streaming text chunk
  | 'tool_use_start'    // AI wants to call a tool
  | 'tool_result'       // Tool executed, here's the result
  | 'mutation_proposal' // Write tool — needs user confirmation
  | 'conversation_meta' // Conversation ID + title update
  | 'done'              // Stream complete
  | 'error';            // Error occurred

export interface ClawSSEEvent {
  type: ClawSSEEventType;
  data: unknown;
}

// ─── Quick Actions ───────────────────────────────────────────

export interface ClawQuickAction {
  label: string;
  prompt: string;
  icon?: string; // Lucide icon name
  category?: string;
}

// ─── Export ──────────────────────────────────────────────────

export type ClawExportFormat = 'pdf' | 'markdown' | 'json' | 'clipboard';
