'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, RefreshCw, Telescope } from 'lucide-react';
import { Button } from '@/components/shared';
import { markdownComponents } from '@/components/shared/markdownComponents';
import {
  RESOURCE_CATEGORIES,
  coerceCategory,
} from '@/lib/knowledge-resources/categories';
import type {
  ClarifyAnswer,
  ClarifyQuestion,
  DeepResearchEvent,
  DeepResearchReport,
} from '@/lib/knowledge-research/types';
import { useCreateResource } from '../../hooks';
import { useDeepResearch } from '../../hooks/useDeepResearch';

interface DeepResearchTabProps {
  onClose: () => void;
}

/** Voortgangsregel afgeleid uit een `phase`-event. */
interface ProgressEntry {
  phase: string;
  label: string;
  done: boolean;
}

/** Bewerkbare velden van het rapport, voorgevuld in de complete-handler. */
interface ReportDraft {
  title: string;
  category: string;
  tags: string;
  summary: string;
}

/** Lokale state-machine — discriminated union, bewust NIET in Zustand. */
type Step =
  | { kind: 'topic' }
  | { kind: 'clarify'; questions: ClarifyQuestion[] }
  | { kind: 'running'; progress: ProgressEntry[]; warnings: string[] }
  | { kind: 'report'; report: DeepResearchReport; draft: ReportDraft };

/**
 * Tab in de "Add Item"-modal die een Deep Research-run aanstuurt:
 * onderwerp → verfijningsvragen → live voortgang → bewerkbaar rapport → opslaan.
 * De volledige flow-state leeft lokaal (state-machine) zodat het sluiten van de
 * modal de run-staat netjes weggooit.
 */
export function DeepResearchTab({ onClose }: DeepResearchTabProps) {
  const research = useDeepResearch();
  const createResource = useCreateResource();

  const [step, setStep] = useState<Step>({ kind: 'topic' });
  const [topic, setTopic] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [runError, setRunError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Voorkomt setState/onClose nadat de modal (en dus deze tab) is gesloten.
  // De setup MOET de ref op true zetten: in React StrictMode (dev) draait de
  // effect mount→cleanup→mount, en zonder reset blijft `.current` na de eerste
  // cleanup voorgoed `false` hangen → elke `if (mountedRef.current)`-guard faalt
  // (clarify-vragen verschenen daardoor nooit). Zie gotchas 2026-03-24.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── (a) Onderwerp → verfijningsvragen ──
  const handleStartClarify = () => {
    if (!topic.trim()) return;
    // Antwoorden van een vorige ronde wissen zodat ze niet in een nieuwe run lekken.
    setAnswers({});
    research.startClarify.mutate(
      { topic: topic.trim() },
      {
        onSuccess: (data) => {
          if (mountedRef.current) setStep({ kind: 'clarify', questions: data.questions });
        },
      }
    );
  };

  // ── (b) Vragen → run ──
  const handleRunResearch = (questions: ClarifyQuestion[]) => {
    setRunError(null);
    const answerList: ClarifyAnswer[] = questions.map((q) => ({
      id: q.id,
      question: q.question,
      answer: (answers[q.id] ?? '').trim(),
    }));
    setStep({ kind: 'running', progress: [], warnings: [] });
    research.runResearch({
      topic: topic.trim(),
      answers: answerList,
      callbacks: {
        onEvent: handleEvent,
        onError: (message) => {
          setRunError(message);
          setStep({ kind: 'topic' });
        },
      },
    });
  };

  // ── SSE-events → state-machine ──
  const handleEvent = (event: DeepResearchEvent) => {
    setStep((prev) => reduceEvent(prev, event));
    if (event.type === 'error') {
      setRunError(event.error);
      setStep({ kind: 'topic' });
    }
  };

  // ── (c) Annuleren tijdens run ──
  const handleCancel = () => {
    research.abort();
    setAnswers({});
    setStep({ kind: 'topic' });
  };

  // ── (e) Opslaan in library ──
  const handleSave = (report: DeepResearchReport, draft: ReportDraft) => {
    if (!draft.title.trim()) return;
    setSaveError(null);
    createResource
      .mutateAsync({
        title: draft.title.trim(),
        author: 'Deep Research',
        category: draft.category,
        type: 'RESEARCH',
        url: '',
        // description heeft een 3000-char serverlimiet (aiSummary 5000); cap defensief.
        description: draft.summary.trim().slice(0, 3000) || undefined,
        tags: draft.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        content: report.markdown,
        aiSummary: draft.summary,
        aiKeyTakeaways: report.keyTakeaways,
        source: 'DEEP_RESEARCH',
        importedMetadata: { sources: report.sources, topic: topic.trim() },
      })
      .then(() => {
        if (mountedRef.current) onClose();
      })
      .catch((err) => {
        if (mountedRef.current) {
          setSaveError(err instanceof Error ? err.message : 'Failed to save');
        }
      });
  };

  // ── Render per stap ──
  if (step.kind === 'clarify') {
    return (
      <ClarifyStep
        questions={step.questions}
        answers={answers}
        onAnswer={(id, value) => setAnswers((p) => ({ ...p, [id]: value }))}
        onRun={() => handleRunResearch(step.questions)}
      />
    );
  }

  if (step.kind === 'running') {
    return <RunningStep progress={step.progress} warnings={step.warnings} onCancel={handleCancel} />;
  }

  if (step.kind === 'report') {
    return (
      <ReportStep
        report={step.report}
        draft={step.draft}
        onDraftChange={(draft) => setStep({ kind: 'report', report: step.report, draft })}
        onSave={() => handleSave(step.report, step.draft)}
        isSaving={createResource.isPending}
        saveError={saveError}
      />
    );
  }

  return (
    <TopicStep
      topic={topic}
      onTopicChange={setTopic}
      onStart={handleStartClarify}
      isLoading={research.startClarify.isPending}
      error={
        runError ??
        (research.startClarify.error instanceof Error
          ? research.startClarify.error.message
          : null)
      }
    />
  );
}

// ─── Event-reducer ─────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  plan: 'Planning the research',
  search: 'Searching sources',
  read: 'Reading sources',
  verify: 'Verifying claims',
  synthesize: 'Synthesizing the report',
  finalize: 'Finalizing',
};

/**
 * Verwerkt één SSE-event in de running-state: voegt fase-regels toe, markeert
 * ze als afgerond en verzamelt warnings. Bij `complete` springt de machine naar
 * de report-stap met voorgevulde, bewerkbare velden.
 */
function reduceEvent(prev: Step, event: DeepResearchEvent): Step {
  if (event.type === 'complete') {
    const { report } = event;
    return {
      kind: 'report',
      report,
      draft: {
        title: report.suggestedTitle,
        category: coerceCategory(report.suggestedCategory),
        tags: report.suggestedTags.join(', '),
        summary: report.summary,
      },
    };
  }

  if (prev.kind !== 'running') return prev;

  if (event.type === 'phase') {
    const label = event.label || PHASE_LABELS[event.phase] || event.phase;
    const existing = prev.progress.find((p) => p.phase === event.phase);
    const done = event.status === 'done';
    const progress = existing
      ? prev.progress.map((p) => (p.phase === event.phase ? { ...p, done } : p))
      : [...prev.progress, { phase: event.phase, label, done }];
    return { ...prev, progress };
  }

  if (event.type === 'warning') {
    return { ...prev, warnings: [...prev.warnings, event.message] };
  }

  return prev;
}

// ─── (a) Topic-stap ────────────────────────────────────────────

interface TopicStepProps {
  topic: string;
  onTopicChange: (value: string) => void;
  onStart: () => void;
  isLoading: boolean;
  error: string | null;
}

function TopicStep({ topic, onTopicChange, onStart, isLoading, error }: TopicStepProps) {
  return (
    <div className="flex flex-col items-center py-6 px-2">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Telescope className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Deep Research</h3>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Describe what you want researched. We&apos;ll ask a few questions to focus the work.
      </p>

      <div className="w-full space-y-3">
        <textarea
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          data-testid="deep-research-topic-input"
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="e.g. How are mid-market SaaS brands using AI in their content workflows in 2026?"
        />
        {error && (
          <p data-testid="deep-research-error" className="text-xs text-red-500">
            {error}
          </p>
        )}
        <Button
          variant="primary"
          onClick={onStart}
          isLoading={isLoading}
          disabled={!topic.trim()}
          className="w-full"
          data-testid="start-research-button"
        >
          Start research
        </Button>
      </div>
    </div>
  );
}

// ─── (b) Clarify-stap ──────────────────────────────────────────

interface ClarifyStepProps {
  questions: ClarifyQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
  onRun: () => void;
}

function ClarifyStep({ questions, answers, onAnswer, onRun }: ClarifyStepProps) {
  const allAnswered = questions.every((q) => (answers[q.id] ?? '').trim().length > 0);
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-gray-500">
        Answer these to focus the research, then run it.
      </p>
      {questions.map((q) => (
        <div key={q.id}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {q.question}
          </label>
          <input
            type="text"
            value={answers[q.id] ?? ''}
            onChange={(e) => onAnswer(q.id, e.target.value)}
            data-testid={`clarify-input-${q.id}`}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder={q.placeholder ?? 'Your answer…'}
          />
        </div>
      ))}
      <Button
        variant="primary"
        onClick={onRun}
        disabled={!allAnswered}
        className="w-full"
        data-testid="run-research-button"
      >
        Run research
      </Button>
    </div>
  );
}

// ─── (c) Running-stap ──────────────────────────────────────────

interface RunningStepProps {
  progress: ProgressEntry[];
  warnings: string[];
  onCancel: () => void;
}

function RunningStep({ progress, warnings, onCancel }: RunningStepProps) {
  const activeIndex = progress.findIndex((p) => !p.done);
  return (
    <div className="space-y-4 py-2" data-testid="research-progress">
      <p className="text-sm text-gray-500">Researching — this can take a few minutes.</p>
      <ul className="space-y-2">
        {progress.length === 0 && (
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
            Starting…
          </li>
        )}
        {progress.map((entry, index) => (
          <li key={entry.phase} className="flex items-center gap-2 text-sm">
            {entry.done ? (
              <span className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
            ) : index === activeIndex ? (
              <RefreshCw className="w-4 h-4 animate-spin text-green-600 flex-shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
            )}
            <span className={entry.done ? 'text-gray-500' : 'text-gray-900'}>
              {entry.label}
            </span>
          </li>
        ))}
      </ul>
      {warnings.length > 0 && <WarningList warnings={warnings} />}
      <Button variant="secondary" onClick={onCancel} className="w-full" data-testid="cancel-research-button">
        Cancel
      </Button>
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <ul className="space-y-0.5">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── (d) Report-stap ───────────────────────────────────────────

interface ReportStepProps {
  report: DeepResearchReport;
  draft: ReportDraft;
  onDraftChange: (draft: ReportDraft) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function ReportStep({ report, draft, onDraftChange, onSave, isSaving, saveError }: ReportStepProps) {
  return (
    <div className="space-y-4 py-2">
      <article
        className="text-gray-800 border border-gray-100 rounded-lg p-4"
        style={{ maxHeight: '40vh', overflowY: 'auto' }}
        data-testid="research-report-preview"
      >
        <ReactMarkdown components={markdownComponents}>{report.markdown}</ReactMarkdown>
      </article>

      {report.warnings.length > 0 && <WarningList warnings={report.warnings} />}

      <ReportFields draft={draft} onChange={onDraftChange} />

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      <Button
        variant="primary"
        onClick={onSave}
        isLoading={isSaving}
        disabled={!draft.title.trim()}
        className="w-full"
        data-testid="save-report-button"
      >
        Save to library
      </Button>
    </div>
  );
}

function ReportFields({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (draft: ReportDraft) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          data-testid="report-title-input"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="Report title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value })}
          data-testid="report-category-select"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          {RESOURCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={draft.tags}
          onChange={(e) => onChange({ ...draft, tags: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="e.g. AI, SaaS, Content"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
        <textarea
          value={draft.summary}
          onChange={(e) => onChange({ ...draft, summary: e.target.value })}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="Short summary…"
        />
      </div>
    </div>
  );
}
