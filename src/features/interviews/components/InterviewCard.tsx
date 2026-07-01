'use client';

import { Badge, Button } from '@/components/shared';
import {
  Lock,
  Calendar,
  Clock,
  Layers,
  Mail,
  MoreVertical,
  Trash2,
  FileText,
  FileJson,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/lib/ui-i18n/format';
import type { Interview, InterviewStatus } from '../types/interview.types';
import { exportInterviewPdf } from '../utils/exportInterviewPdf';
import { exportInterviewJson } from '../utils/exportInterviewJson';

const STATUS_VARIANT: Record<InterviewStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal'> = {
  TO_SCHEDULE: 'default',
  DRAFT: 'default',
  SCHEDULED: 'info',
  INTERVIEW_HELD: 'teal',
  IN_PROGRESS: 'warning',
  IN_REVIEW: 'teal',
  COMPLETED: 'success',
  APPROVED: 'success',
  CANCELLED: 'danger',
};

interface InterviewCardProps {
  interview: Interview;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InterviewCard({
  interview,
  onView,
  onDelete,
}: InterviewCardProps) {
  const { t } = useTranslation('interviews');
  const { formatDate } = useFormat();
  const [menuOpen, setMenuOpen] = useState(false);
  const statusVariant = STATUS_VARIANT[interview.status];

  const scheduledDate = interview.scheduledDate
    ? formatDate(new Date(interview.scheduledDate), {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">
            {interview.title || t('card.defaultTitle', { number: interview.orderNumber })}
          </h3>
          {interview.isLocked && (
            <Lock className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant} size="sm">
            {t(`statusLabel.${interview.status}`)}
          </Badge>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                  {(interview.status === 'COMPLETED' || interview.status === 'APPROVED') && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportInterviewPdf(interview);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {t('card.exportPdf')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportInterviewJson(interview);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        {t('card.exportJson')}
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                    </>
                  )}
                  <button
                    onClick={() => {
                      onDelete(interview.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('card.delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {interview.intervieweeName && (
        <p className="text-sm text-gray-700 mb-1">
          {interview.intervieweeName}
          {interview.intervieweePosition && (
            <span className="text-gray-500">
              {' '}
              &middot; {interview.intervieweePosition}
            </span>
          )}
          {interview.intervieweeCompany && (
            <span className="text-gray-500">
              {' '}
              &middot; {interview.intervieweeCompany}
            </span>
          )}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        {scheduledDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {scheduledDate}
          </span>
        )}
        {interview.scheduledTime && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {interview.scheduledTime}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {t('unit.min', { count: interview.durationMinutes })}
        </span>
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          {t('card.questions', { count: interview.questions.length })}
        </span>
        {interview.intervieweeEmail && (
          <span className="flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" />
            {interview.intervieweeEmail}
          </span>
        )}
      </div>

      <Button variant="secondary" size="sm" onClick={() => onView(interview.id)}>
        {t('card.view')}
      </Button>
    </div>
  );
}
