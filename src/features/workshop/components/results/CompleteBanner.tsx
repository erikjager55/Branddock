'use client';

import { Badge, Button } from '@/components/shared';
import {
  CheckCircle,
  Calendar,
  Users,
  Clock,
  User,
  FileDown,
  FileJson,
} from 'lucide-react';
import type { Workshop } from '../../types/workshop.types';

interface CompleteBannerProps {
  workshop: Workshop;
  onExportRaw: () => void;
}

export function CompleteBanner({ workshop, onExportRaw }: CompleteBannerProps) {
  const completedDate = workshop.completedAt
    ? new Date(workshop.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const durationText = workshop.durationMinutes
    ? `${Math.round(workshop.durationMinutes)} min`
    : 'N/A';

  return (
    <div data-testid="complete-banner" className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {workshop.title || 'Canvas Workshop'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Workshop completed successfully. Review your results below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">Completed</Badge>
          <Button variant="secondary" size="sm" icon={FileDown} disabled>
            PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileJson}
            onClick={onExportRaw}
          >
            Raw Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-emerald-200">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">Date</span>
            <span className="text-gray-900 font-medium">{completedDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">Participants</span>
            <span className="text-gray-900 font-medium">
              {workshop.participantCount ?? 0}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">Duration</span>
            <span className="text-gray-900 font-medium">{durationText}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-gray-500 block text-xs">Facilitator</span>
            <span className="text-gray-900 font-medium">
              {workshop.facilitatorName || 'Self-guided'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
