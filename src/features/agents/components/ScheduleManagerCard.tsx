'use client';

import React, { useState } from 'react';
import { CalendarClock, Loader2, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/ui/layout';
import { Button } from '@/components/shared';
import { useFormat } from '@/lib/ui-i18n/format';
import {
  useAgentSchedules,
  useCreateAgentSchedule,
  useUpdateAgentSchedule,
  useDeleteAgentSchedule,
} from '../hooks';
import type {
  AgentSchedule,
  CatalogAgentUseCase,
  ScheduleCadenceValue,
} from '../types/agents.types';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** EVERY_MINUTE is een dev/smoke-cadence; de server weigert hem in productie. */
const CADENCES: ScheduleCadenceValue[] =
  process.env.NODE_ENV === 'production'
    ? ['DAILY', 'WEEKLY', 'MONTHLY']
    : ['DAILY', 'WEEKLY', 'MONTHLY', 'EVERY_MINUTE'];

// focus:ring-primary/20 i.p.v. /40: alleen /20-/30-/50 staan in de
// gecompileerde index.css (Tailwind-4-purge-gotcha).
const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20';

/**
 * Schedule-beheer op de agent-detail-pagina (agents-scheduling, slice 2):
 * lijst met pause/resume + delete, en een inline create-form. Scheduled
 * runs draaien headless via de cron-tick; resultaten landen in de inbox.
 */
export function ScheduleManagerCard({
  agentId,
  useCases,
}: {
  agentId: string;
  useCases: CatalogAgentUseCase[];
}) {
  const { t } = useTranslation('agents');
  const { data: schedules, isLoading, isError, refetch } = useAgentSchedules(agentId);
  const updateSchedule = useUpdateAgentSchedule();
  const deleteSchedule = useDeleteAgentSchedule();
  const [showForm, setShowForm] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const onToggleEnabled = (schedule: AgentSchedule) => {
    setRowError(null);
    updateSchedule.mutate(
      { scheduleId: schedule.id, enabled: !schedule.enabled },
      { onError: (err) => setRowError(err instanceof Error ? err.message : t('detail.schedules.updateError')) },
    );
  };

  const onDelete = (schedule: AgentSchedule) => {
    // Finalize-MINOR: one-click delete zonder bevestiging was te makkelijk
    // voor een destructieve actie op een lopend schema.
    if (!window.confirm(t('detail.schedules.deleteConfirm'))) return;
    setRowError(null);
    deleteSchedule.mutate(schedule.id, {
      onError: (err) => setRowError(err instanceof Error ? err.message : t('detail.schedules.deleteError')),
    });
  };

  return (
    <SectionCard icon={CalendarClock} title={t('detail.schedules.title')}>
      <p className="text-sm text-muted-foreground mb-4">{t('detail.schedules.subtitle')}</p>

      {isError ? (
        <div className="flex items-center justify-between gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span>{t('detail.schedules.loadError')}</span>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            {t('detail.schedules.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <div data-testid="schedules-loading" className="h-10 rounded-lg bg-gray-100 animate-pulse" />
      ) : (
        <>
          {(schedules ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('detail.schedules.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {(schedules ?? []).map((schedule) => (
                <ScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  useCases={useCases}
                  busy={updateSchedule.isPending || deleteSchedule.isPending}
                  onToggleEnabled={() => onToggleEnabled(schedule)}
                  onDelete={() => onDelete(schedule)}
                />
              ))}
            </ul>
          )}
          {rowError && (
            <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
              {rowError}
            </p>
          )}
          <div className="mt-4">
            {showForm ? (
              <ScheduleCreateForm
                agentId={agentId}
                useCases={useCases}
                onDone={() => setShowForm(false)}
              />
            ) : (
              <Button
                data-testid="schedule-new-button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setShowForm(true)}
              >
                {t('detail.schedules.newButton')}
              </Button>
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ─── Row ─────────────────────────────────────────────────────

function ScheduleRow({
  schedule,
  useCases,
  busy,
  onToggleEnabled,
  onDelete,
}: {
  schedule: AgentSchedule;
  useCases: CatalogAgentUseCase[];
  busy: boolean;
  onToggleEnabled: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('agents');
  const { formatRelative } = useFormat();

  const useCaseLabel = useCases.find((u) => u.id === schedule.useCaseId)?.label;
  const summary = cadenceSummary(schedule, t);

  return (
    <li
      data-testid="schedule-row"
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        schedule.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {useCaseLabel ?? t('detail.schedules.defaultTask')}
        </p>
        <p className="text-xs text-gray-500">
          {summary}
          {schedule.enabled && (
            <>
              {' · '}
              {t('detail.schedules.nextRun', { relative: formatRelative(schedule.nextRunAt) })}
            </>
          )}
          {!schedule.enabled && <> · {t('detail.schedules.paused')}</>}
        </p>
      </div>
      <Button
        data-testid="schedule-toggle"
        variant="ghost"
        size="sm"
        icon={schedule.enabled ? Pause : Play}
        disabled={busy}
        onClick={onToggleEnabled}
        aria-label={schedule.enabled ? t('detail.schedules.pause') : t('detail.schedules.resume')}
      >
        {schedule.enabled ? t('detail.schedules.pause') : t('detail.schedules.resume')}
      </Button>
      <Button
        data-testid="schedule-delete"
        variant="ghost"
        size="sm"
        icon={Trash2}
        disabled={busy}
        onClick={onDelete}
        aria-label={t('detail.schedules.delete')}
      >
        {t('detail.schedules.delete')}
      </Button>
    </li>
  );
}

function cadenceSummary(schedule: AgentSchedule, t: (key: string, opts?: Record<string, unknown>) => string): string {
  switch (schedule.cadence) {
    case 'EVERY_MINUTE':
      return t('detail.schedules.summary.everyMinute');
    case 'WEEKLY':
      return t('detail.schedules.summary.weekly', {
        day: t(`detail.schedules.weekdays.${schedule.dayOfWeek ?? 1}`),
        time: schedule.timeOfDay,
      });
    case 'MONTHLY':
      return t('detail.schedules.summary.monthly', {
        day: schedule.dayOfMonth ?? 1,
        time: schedule.timeOfDay,
      });
    default:
      return t('detail.schedules.summary.daily', { time: schedule.timeOfDay });
  }
}

// ─── Create form ─────────────────────────────────────────────

function ScheduleCreateForm({
  agentId,
  useCases,
  onDone,
}: {
  agentId: string;
  useCases: CatalogAgentUseCase[];
  onDone: () => void;
}) {
  const { t } = useTranslation('agents');
  const createSchedule = useCreateAgentSchedule();
  const [useCaseId, setUseCaseId] = useState<string>(useCases[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [cadence, setCadence] = useState<ScheduleCadenceValue>('WEEKLY');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!message.trim()) {
      setError(t('detail.schedules.form.messageRequired'));
      return;
    }
    createSchedule.mutate(
      {
        agentId,
        useCaseId: useCaseId || undefined,
        input: { message: message.trim() },
        cadence,
        timeOfDay,
        ...(cadence === 'WEEKLY' ? { dayOfWeek } : {}),
        ...(cadence === 'MONTHLY' ? { dayOfMonth } : {}),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSuccess: () => onDone(),
        onError: (err) =>
          setError(err instanceof Error ? err.message : t('detail.schedules.form.createError')),
      },
    );
  };

  return (
    <div data-testid="schedule-create-form" className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600">{t('detail.schedules.form.useCase')}</span>
          <select
            className={`mt-1 ${inputClass}`}
            value={useCaseId}
            onChange={(e) => setUseCaseId(e.target.value)}
          >
            {useCases.map((useCase) => (
              <option key={useCase.id} value={useCase.id}>
                {useCase.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">{t('detail.schedules.form.cadence')}</span>
          <select
            data-testid="schedule-cadence-select"
            className={`mt-1 ${inputClass}`}
            value={cadence}
            onChange={(e) => setCadence(e.target.value as ScheduleCadenceValue)}
          >
            {CADENCES.map((value) => (
              <option key={value} value={value}>
                {t(`detail.schedules.cadences.${value}`)}
              </option>
            ))}
          </select>
        </label>
        {cadence === 'WEEKLY' && (
          <label className="block">
            <span className="text-xs font-medium text-gray-600">{t('detail.schedules.form.weekday')}</span>
            <select
              className={`mt-1 ${inputClass}`}
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {t(`detail.schedules.weekdays.${day}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {cadence === 'MONTHLY' && (
          <label className="block">
            <span className="text-xs font-medium text-gray-600">{t('detail.schedules.form.monthday')}</span>
            <select
              className={`mt-1 ${inputClass}`}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
            >
              {MONTH_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        )}
        {cadence !== 'EVERY_MINUTE' && (
          <label className="block">
            <span className="text-xs font-medium text-gray-600">{t('detail.schedules.form.time')}</span>
            <input
              type="time"
              className={`mt-1 ${inputClass}`}
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </label>
        )}
      </div>
      <label className="block">
        <span className="text-xs font-medium text-gray-600">{t('detail.schedules.form.message')}</span>
        <textarea
          data-testid="schedule-message-input"
          className={`mt-1 ${inputClass}`}
          style={{ minHeight: 72 }}
          placeholder={t('detail.schedules.form.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <Button
          data-testid="schedule-create-submit"
          variant="cta"
          size="sm"
          disabled={createSchedule.isPending}
          icon={createSchedule.isPending ? Loader2 : CalendarClock}
          onClick={submit}
        >
          {createSchedule.isPending
            ? t('detail.schedules.form.creating')
            : t('detail.schedules.form.create')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone} disabled={createSchedule.isPending}>
          {t('detail.schedules.form.cancel')}
        </Button>
      </div>
    </div>
  );
}
