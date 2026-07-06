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
  /** Only set when type === 'deliverable' — the campaign this deliverable
   *  belongs to. Lets Claw fire create_deliverable in the same campaign
   *  without a second question. */
  campaignId?: string;
  /** Only set when type === 'deliverable' — the content-type slug. Lets the
   *  system prompt route web-page deliverables to the LP text-edit tools. */
  contentType?: string;
  /** Only set when type === 'deliverable' — persisted contentTypeInputs (o.a.
   *  optimizationGoals). Laat de assembler `isPuckRenderable` evalueren zodat
   *  long-form GEO-pagina's (geo-doel aan) de "direct bewerkbaar"-hint krijgen. */
  contentTypeInputs?: Record<string, unknown> | null;
};

/**
 * Optional per-agent chat-scope (agents-ui-inbox, ADR 2026-07-05 D6).
 * When set, the panel chats "with" a catalog agent: the chat request
 * carries the agentId and the header shows the persona. Strictly
 * additive — null (default) keeps every existing Claw flow unchanged.
 */
export type ClawAgentScope = {
  agentId: string;
  personaName: string;
  personaRole: string;
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

export type FeatureImpact = 'nice-to-have' | 'useful' | 'important' | 'critical';

export interface FeatureRequestFormState {
  /** Where in the app the user was when requesting — captured from currentPage. */
  page: string;
  title: string;
  description: string;
  impact: FeatureImpact;
  /** Optional URL / mockup reference. */
  screenshot: string;
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
  /** Where in the app the user was when giving feedback — captured from currentPage. */
  page: string;
  /** Optional anchoring to a specific assistant message — captured when /feedback is typed. */
  conversationId: string | null;
  messageId: string | null;
  messageContent: string | null;
  sentiment: FeedbackSentiment;
  tags: FeedbackTag[];
  comment: string;
}

/**
 * Quick Content form — structured alternative to the AI mini-interview.
 * Triggered by the TopNav Quick Content button or `/quick` in chat.
 * Requires an existing campaign — Quick Content is meant to be quick, so
 * setting up a new campaign first lives in the regular Campaigns flow.
 */
export interface QuickContentFormState {
  /** Kebab-case content type slug (e.g. "linkedin-post"). */
  contentType: string;
  /** Required — must reference an existing campaign in the workspace. */
  campaignId: string | null;
  /** Optional — defaults to a friendly form of contentType when empty. */
  title: string;
  /** Briefing fields — all optional, but at least one helps the user
   *  start with usable Step 1 context in the Canvas. */
  objective: string;
  keyMessage: string;
  toneDirection: string;
  callToAction: string;
}

interface ClawStore {
  // ── Panel State ──────────────────────────────────────────
  isOpen: boolean;
  viewMode: 'panel' | 'overlay';
  openClaw: () => void;
  closeClaw: () => void;
  toggleClaw: () => void;
  toggleViewMode: () => void;

  // ── Agent Scope (agents-ui-inbox) ─────────────────────────
  /** Non-null while the panel is scoped to a catalog agent. */
  agentScope: ClawAgentScope | null;
  /** Open the panel scoped to an agent; a scope-switch starts a fresh conversation. */
  openClawForAgent: (scope: ClawAgentScope) => void;

  // ── Active Stream Abort ───────────────────────────────────
  /**
   * Abort-hook voor de in-flight chat-stream, gezet door InputBar bij
   * stream-start. Scope-wissels/-clears roepen hem aan zodat een oud
   * antwoord nooit in een verse (on)gescopede conversatie finaliseert
   * en `isStreaming` niet blijft hangen.
   */
  activeStreamAbort: (() => void) | null;
  setActiveStreamAbort: (abort: (() => void) | null) => void;

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
  /**
   * Queue voor parallelle mutation-proposals. AI kan in 1 response meerdere
   * write-tools aanroepen (bv. update_deliverable_brief + visual_brief +
   * content_inputs voor canvas Step 1). Voorheen overwrote elke nieuwe
   * proposal de vorige -> user zag alleen de laatste. Nu append-to-queue;
   * MutationConfirmCard pakt eerste, na confirm pop volgende. UX-fix
   * 2026-05-13.
   */
  pendingMutationQueue: MutationProposal[];
  enqueuePendingMutation: (proposal: MutationProposal) => void;
  /** Pop volgende uit queue + activeer als pendingMutation, of clear beide. */
  advanceMutationQueue: () => void;
  clearMutationQueue: () => void;

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

  // ── Feature Request ─────────────────────────────────────
  featureRequestForm: FeatureRequestFormState | null;
  openFeatureRequestForm: () => void;
  updateFeatureRequestForm: (fields: Partial<FeatureRequestFormState>) => void;
  closeFeatureRequestForm: () => void;

  // ── Feedback ────────────────────────────────────────────
  feedbackForm: FeedbackFormState | null;
  openFeedbackForm: (anchor?: {
    conversationId?: string | null;
    messageId?: string | null;
    messageContent?: string | null;
  }) => void;
  updateFeedbackForm: (fields: Partial<FeedbackFormState>) => void;
  closeFeedbackForm: () => void;

  // ── Quick Content ───────────────────────────────────────
  quickContentForm: QuickContentFormState | null;
  openQuickContentForm: () => void;
  updateQuickContentForm: (fields: Partial<QuickContentFormState>) => void;
  closeQuickContentForm: () => void;

  // ── Reset ────────────────────────────────────────────────
  startNewConversation: () => void;
}

/**
 * Reset-slice bij het verlaten van een agent-gescoped gesprek: scope weg
 * én conversatie-state vers, zodat de globale overlay altijd ongescoped
 * en schoon opent. Abort bewust als side-effect hier (review-fix
 * 2026-07-06): een in-flight stream mag nooit in de verse conversatie
 * finaliseren of `isStreaming` laten hangen.
 */
function clearAgentScopeState(s: Pick<ClawStore, 'activeStreamAbort'>) {
  s.activeStreamAbort?.();
  return {
    agentScope: null,
    activeConversationId: null,
    messages: [],
    streamingText: '',
    pendingMutation: null,
    inputText: '',
    attachments: [],
    activityStatus: null,
    isStreaming: false,
    activeStreamAbort: null,
  };
}

export const useClawStore = create<ClawStore>((set, get) => ({
  // Panel
  isOpen: false,
  viewMode: 'panel',
  // Agent-scope opruimen bij open/close van de reguliere assistent zodat
  // een agent-conversatie nooit in de globale overlay lekt. Met
  // agentScope null (default) zijn deze setters byte-identiek aan het
  // gedrag vóór agents-ui-inbox.
  // openClaw behoudt inputText: openClawWithPrompt zet de prompt vóór de open-call.
  openClaw: () => set((s) => ({ isOpen: true, viewMode: 'panel' as const, ...(s.agentScope ? { ...clearAgentScopeState(s), inputText: s.inputText } : {}) })),
  closeClaw: () => set((s) => ({ isOpen: false, viewMode: 'panel' as const, bugReportForm: null, featureRequestForm: null, feedbackForm: null, quickContentForm: null, ...(s.agentScope ? clearAgentScopeState(s) : {}) })),
  toggleClaw: () => set((s) => ({ isOpen: !s.isOpen, viewMode: s.isOpen ? 'panel' : s.viewMode, ...(s.isOpen && s.agentScope ? clearAgentScopeState(s) : {}) })),
  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'panel' ? 'overlay' : 'panel' })),

  // Agent scope
  agentScope: null,
  openClawForAgent: (scope) =>
    set((s) => ({
      isOpen: true,
      viewMode: 'panel',
      // Scope-wissel (incl. vanuit een ongescoped gesprek): vers gesprek +
      // abort van de in-flight stream, zodat persona-context en historie
      // elkaar niet vervuilen.
      ...(s.agentScope?.agentId !== scope.agentId ? clearAgentScopeState(s) : {}),
      agentScope: scope,
    })),

  // Active stream abort
  activeStreamAbort: null,
  setActiveStreamAbort: (abort) => set({ activeStreamAbort: abort }),

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
    set((s) => {
      // Review-fix 2026-07-06: een (oud, regulier) gesprek openen vanuit
      // een gescoped panel neemt de agent-persona niet mee — scope weg en
      // de in-flight stream geabort. Zonder scope is dit pad byte-identiek.
      if (s.agentScope) s.activeStreamAbort?.();
      return {
        activeConversationId: id,
        messages: messages ?? [],
        streamingText: '',
        pendingMutation: null,
        ...(s.agentScope ? { agentScope: null, isStreaming: false, activeStreamAbort: null } : {}),
      };
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
  pendingMutationQueue: [],
  enqueuePendingMutation: (proposal) =>
    set((state) => {
      // Wanneer geen actieve mutation: directly activate (single-proposal pad
      // gebruikt deze setter ook, bewaart bestaand gedrag). Anders queue.
      if (!state.pendingMutation) {
        return { pendingMutation: proposal };
      }
      return { pendingMutationQueue: [...state.pendingMutationQueue, proposal] };
    }),
  advanceMutationQueue: () =>
    set((state) => {
      if (state.pendingMutationQueue.length === 0) {
        return { pendingMutation: null, pendingMutationQueue: [] };
      }
      const [next, ...rest] = state.pendingMutationQueue;
      return { pendingMutation: next, pendingMutationQueue: rest };
    }),
  clearMutationQueue: () =>
    set({ pendingMutation: null, pendingMutationQueue: [] }),

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
    // Only one assistant form is ever visible at a time.
    featureRequestForm: null,
    feedbackForm: null,
    quickContentForm: null,
  }),
  updateBugReportForm: (fields) => set((s) => ({
    bugReportForm: s.bugReportForm ? { ...s.bugReportForm, ...fields } : null,
  })),
  closeBugReportForm: () => set({ bugReportForm: null }),

  // Feature request
  featureRequestForm: null,
  openFeatureRequestForm: () => set({
    featureRequestForm: {
      page: get().currentPage,
      title: '',
      description: '',
      impact: 'useful',
      screenshot: '',
    },
    // Only one assistant form is ever visible at a time.
    bugReportForm: null,
    feedbackForm: null,
    quickContentForm: null,
  }),
  updateFeatureRequestForm: (fields) => set((s) => ({
    featureRequestForm: s.featureRequestForm ? { ...s.featureRequestForm, ...fields } : null,
  })),
  closeFeatureRequestForm: () => set({ featureRequestForm: null }),

  // Feedback
  feedbackForm: null,
  openFeedbackForm: (anchor) =>
    set({
      feedbackForm: {
        page: get().currentPage,
        conversationId: anchor?.conversationId ?? null,
        messageId: anchor?.messageId ?? null,
        messageContent: anchor?.messageContent ?? null,
        sentiment: 'neutral',
        tags: [],
        comment: '',
      },
      // Only one assistant form is ever visible at a time.
      bugReportForm: null,
      featureRequestForm: null,
      quickContentForm: null,
    }),
  updateFeedbackForm: (fields) =>
    set((s) => ({
      feedbackForm: s.feedbackForm ? { ...s.feedbackForm, ...fields } : null,
    })),
  closeFeedbackForm: () => set({ feedbackForm: null }),

  // Quick Content
  quickContentForm: null,
  openQuickContentForm: () =>
    set({
      quickContentForm: {
        contentType: '',
        campaignId: null,
        title: '',
        objective: '',
        keyMessage: '',
        toneDirection: '',
        callToAction: '',
      },
      // Mirror the bug-/feedback-form pattern: opening Quick Content
      // dismisses the other forms so only one is ever visible at a time.
      bugReportForm: null,
      featureRequestForm: null,
      feedbackForm: null,
    }),
  updateQuickContentForm: (fields) =>
    set((s) => ({
      quickContentForm: s.quickContentForm ? { ...s.quickContentForm, ...fields } : null,
    })),
  closeQuickContentForm: () => set({ quickContentForm: null }),

  // Reset
  // Bewust: startNewConversation behoudt een actieve agentScope — "nieuw
  // gesprek" binnen het gescopede panel betekent een vers gesprek met
  // dezélfde agent. Scope verlaten loopt via close/openClaw/
  // setActiveConversation (review-besluit 2026-07-06).
  startNewConversation: () =>
    set({
      activeConversationId: null,
      messages: [],
      streamingText: '',
      pendingMutation: null,
      inputText: '',
      attachments: [],
      bugReportForm: null,
      featureRequestForm: null,
      feedbackForm: null,
      quickContentForm: null,
      activityStatus: null,
    }),
}));
