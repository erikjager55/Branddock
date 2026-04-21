import { create } from 'zustand';
import type {
  ClawMessage,
  ClawConversationMeta,
  ContextSelection,
  ClawAttachment,
  MutationProposal,
  ClawQuickAction,
  ClawPageContext,
  ClawWizardSnapshot,
} from '@/lib/claw/claw.types';
import { DEFAULT_CONTEXT_MODULES } from '@/lib/claw/claw.types';

export type ActiveEntity = {
  type: NonNullable<ClawPageContext['entityType']>;
  id: string;
  name: string;
};

/** Navigation intent emitted by the Brand Assistant (e.g. after a create). App.tsx watches this and routes accordingly. */
export type PendingNavigation = {
  /** Sidebar section ID, e.g. 'persona-detail', 'trend-detail', 'brand-asset-detail'. */
  section: string;
  /** Optional entity ID for detail pages. */
  entityId?: string;
};

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BugReportFormState {
  page: string;
  description: string;
  severity: BugSeverity;
  screenshot: string;
}

export interface BugReportItem {
  id: string;
  page: string;
  description: string;
  severity: string;
  screenshot: string | null;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string };
}

export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';
export type FeedbackTag =
  | 'inaccurate'
  | 'off-brand'
  | 'too-verbose'
  | 'too-generic'
  | 'unhelpful'
  | 'other';

export interface FeedbackFormState {
  /** Optional anchoring to a specific assistant message — captured when /feedback is typed. */
  conversationId: string | null;
  messageId: string | null;
  messageContent: string | null;
  sentiment: FeedbackSentiment;
  tags: FeedbackTag[];
  comment: string;
}

interface ClawStore {
  // ── Panel State ──────────────────────────────────────────
  isOpen: boolean;
  viewMode: 'panel' | 'overlay';
  openClaw: () => void;
  closeClaw: () => void;
  toggleClaw: () => void;
  toggleViewMode: () => void;

  // ── Current Page (synced from App.tsx) ───────────────────
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // ── Active Entity (synced from detail pages) ─────────────
  activeEntity: ActiveEntity | null;
  setActiveEntity: (entity: ActiveEntity | null) => void;

  // ── Wizard Snapshot (synced from multi-step flows) ───────
  wizardSnapshot: ClawWizardSnapshot | null;
  setWizardSnapshot: (snapshot: ClawWizardSnapshot | null) => void;

  // ── Pending Navigation (consumed by App.tsx) ─────────────
  pendingNavigation: PendingNavigation | null;
  requestNavigation: (nav: PendingNavigation) => void;
  clearPendingNavigation: () => void;

  // ── Active Conversation ──────────────────────────────────
  activeConversationId: string | null;
  messages: ClawMessage[];
  isStreaming: boolean;
  streamingText: string;

  setActiveConversation: (id: string | null, messages?: ClawMessage[]) => void;
  addMessage: (message: ClawMessage) => void;
  appendStreamingText: (text: string) => void;
  finalizeStreaming: (assistantMessage: ClawMessage) => void;
  setIsStreaming: (streaming: boolean) => void;
  resetStreamingText: () => void;

  // ── Activity Status (live progress during streaming) ─────
  /** Human-readable label of what the AI is doing right now, e.g. "Personas aan het lezen...". Null when idle or when answer text is streaming. */
  activityStatus: string | null;
  setActivityStatus: (status: string | null) => void;

  // ── Context Selection ────────────────────────────────────
  contextSelection: ContextSelection;
  setContextSelection: (cs: ContextSelection) => void;
  toggleModule: (module: string) => void;

  // ── Attachments ──────────────────────────────────────────
  attachments: ClawAttachment[];
  addAttachment: (attachment: ClawAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;

  // ── Input ────────────────────────────────────────────────
  inputText: string;
  setInputText: (text: string) => void;

  // ── Pending Mutation ─────────────────────────────────────
  pendingMutation: MutationProposal | null;
  setPendingMutation: (proposal: MutationProposal | null) => void;

  // ── Conversation History ─────────────────────────────────
  conversations: ClawConversationMeta[];
  setConversations: (conversations: ClawConversationMeta[]) => void;
  /** Sidebar visibility in overlay (full-screen) mode. */
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  /** Popover visibility when Brand Assistant is in panel (side) mode. */
  isHistoryPopoverOpen: boolean;
  toggleHistoryPopover: () => void;
  closeHistoryPopover: () => void;

  // ── Quick Actions ────────────────────────────────────────
  quickActions: ClawQuickAction[];
  setQuickActions: (actions: ClawQuickAction[]) => void;

  // ── Bug Report ──────────────────────────────────────────
  bugReportForm: BugReportFormState | null;
  openBugReportForm: () => void;
  updateBugReportForm: (fields: Partial<BugReportFormState>) => void;
  closeBugReportForm: () => void;

  bugLogbook: BugReportItem[] | null;
  openBugLogbook: () => void;
  closeBugLogbook: () => void;
  setBugLogbook: (bugs: BugReportItem[]) => void;

  // ── Feedback ────────────────────────────────────────────
  feedbackForm: FeedbackFormState | null;
  openFeedbackForm: (anchor?: {
    conversationId?: string | null;
    messageId?: string | null;
    messageContent?: string | null;
  }) => void;
  updateFeedbackForm: (fields: Partial<FeedbackFormState>) => void;
  closeFeedbackForm: () => void;

  // ── Reset ────────────────────────────────────────────────
  startNewConversation: () => void;
}

export const useClawStore = create<ClawStore>((set, get) => ({
  // Panel
  isOpen: false,
  viewMode: 'panel',
  openClaw: () => set({ isOpen: true, viewMode: 'panel' }),
  closeClaw: () => set({ isOpen: false, viewMode: 'panel', bugReportForm: null, bugLogbook: null, feedbackForm: null }),
  toggleClaw: () => set((s) => ({ isOpen: !s.isOpen, viewMode: s.isOpen ? 'panel' : s.viewMode })),
  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'panel' ? 'overlay' : 'panel' })),

  // Current page
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Active entity
  activeEntity: null,
  setActiveEntity: (entity) => set({ activeEntity: entity }),

  // Wizard snapshot
  wizardSnapshot: null,
  setWizardSnapshot: (snapshot) => set({ wizardSnapshot: snapshot }),

  // Pending navigation intent
  pendingNavigation: null,
  requestNavigation: (nav) => set({ pendingNavigation: nav }),
  clearPendingNavigation: () => set({ pendingNavigation: null }),

  // Active conversation
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingText: '',

  setActiveConversation: (id, messages) =>
    set({
      activeConversationId: id,
      messages: messages ?? [],
      streamingText: '',
      pendingMutation: null,
    }),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  appendStreamingText: (text) =>
    set((s) => ({ streamingText: s.streamingText + text })),
  finalizeStreaming: (assistantMessage) =>
    set((s) => ({
      messages: [...s.messages, assistantMessage],
      streamingText: '',
      isStreaming: false,
      activityStatus: null,
    })),
  setIsStreaming: (streaming) =>
    set((s) => ({
      isStreaming: streaming,
      // Clear activity status when streaming stops
      activityStatus: streaming ? s.activityStatus : null,
    })),
  resetStreamingText: () => set({ streamingText: '' }),

  activityStatus: null,
  setActivityStatus: (status) => set({ activityStatus: status }),

  // Context
  contextSelection: {
    modules: [...DEFAULT_CONTEXT_MODULES],
  },
  setContextSelection: (cs) => set({ contextSelection: cs }),
  toggleModule: (module) =>
    set((s) => {
      const modules = s.contextSelection.modules.includes(module as never)
        ? s.contextSelection.modules.filter((m) => m !== module)
        : [...s.contextSelection.modules, module as never];
      return { contextSelection: { ...s.contextSelection, modules } };
    }),

  // Attachments
  attachments: [],
  addAttachment: (attachment) =>
    set((s) => ({ attachments: [...s.attachments, attachment] })),
  removeAttachment: (id) =>
    set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) })),
  clearAttachments: () => set({ attachments: [] }),

  // Input
  inputText: '',
  setInputText: (text) => set({ inputText: text }),

  // Pending mutation
  pendingMutation: null,
  setPendingMutation: (proposal) => set({ pendingMutation: proposal }),

  // Conversation history
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  isHistoryPopoverOpen: false,
  toggleHistoryPopover: () => set((s) => ({ isHistoryPopoverOpen: !s.isHistoryPopoverOpen })),
  closeHistoryPopover: () => set({ isHistoryPopoverOpen: false }),

  // Quick actions
  quickActions: [],
  setQuickActions: (actions) => set({ quickActions: actions }),

  // Bug report
  bugReportForm: null,
  openBugReportForm: () => set({
    bugReportForm: {
      page: get().currentPage,
      description: '',
      severity: 'medium',
      screenshot: '',
    },
    bugLogbook: null,
  }),
  updateBugReportForm: (fields) => set((s) => ({
    bugReportForm: s.bugReportForm ? { ...s.bugReportForm, ...fields } : null,
  })),
  closeBugReportForm: () => set({ bugReportForm: null }),

  bugLogbook: null,
  openBugLogbook: () => set({ bugLogbook: [], bugReportForm: null }),
  closeBugLogbook: () => set({ bugLogbook: null }),
  setBugLogbook: (bugs) => set({ bugLogbook: bugs }),

  // Feedback
  feedbackForm: null,
  openFeedbackForm: (anchor) =>
    set({
      feedbackForm: {
        conversationId: anchor?.conversationId ?? null,
        messageId: anchor?.messageId ?? null,
        messageContent: anchor?.messageContent ?? null,
        sentiment: 'neutral',
        tags: [],
        comment: '',
      },
      bugReportForm: null,
      bugLogbook: null,
    }),
  updateFeedbackForm: (fields) =>
    set((s) => ({
      feedbackForm: s.feedbackForm ? { ...s.feedbackForm, ...fields } : null,
    })),
  closeFeedbackForm: () => set({ feedbackForm: null }),

  // Reset
  startNewConversation: () =>
    set({
      activeConversationId: null,
      messages: [],
      streamingText: '',
      pendingMutation: null,
      inputText: '',
      attachments: [],
      bugReportForm: null,
      bugLogbook: null,
      feedbackForm: null,
      activityStatus: null,
    }),
}));
