'use client';

import { Badge, Button } from '@/components/shared';
import {
  Lock,
  Calendar,
  Clock,
  Layers,
  Mail,
  Phone,
  MoreVertical,
  Copy,
  Trash2,
  Unlock,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import type { Interview, InterviewStatus } from '../types/interview.types';

const STATUS_MAP: Record<InterviewStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal' }> = {
  TO_SCHEDULE: { label: 'To Schedule', variant: 'default' },
  DRAFT: { label: 'Draft', variant: 'default' },
  SCHEDULED: { label: 'Scheduled', variant: 'info' },
  INTERVIEW_HELD: { label: 'Interview Held', variant: 'teal' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  IN_REVIEW: { label: 'In Review', variant: 'teal' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  APPROVED: { label: 'Approved', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

interface InterviewCardProps {
  interview: Interview;
  onView: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InterviewCard({
  interview,
  onView,
  onDuplicate,
  onDelete,
}: InterviewCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = STATUS_MAP[interview.status];

  const scheduledDate = interview.scheduledDate
    ? new Date(interview.scheduledDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">
            {interview.title || `Interview #${interview.orderNumber}`}
          </h3>
          {interview.isLocked && (
            <Lock className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} size="sm">
            {status.label}
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
                  <button
                    onClick={() => {
                      onDuplicate(interview.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      onDelete(interview.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
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
          {interview.durationMinutes} min
        </span>
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          {interview.questions.length} questions
        </span>
        {interview.intervieweeEmail && (
          <span className="flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" />
            {interview.intervieweeEmail}
          </span>
        )}
      </div>

      <Button variant="secondary" size="sm" onClick={() => onView(interview.id)}>
        View
      </Button>
    </div>
  );
}
