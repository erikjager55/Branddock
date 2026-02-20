'use client';

import { Badge } from '@/components/shared';
import { Calendar, Clock, User, Layers } from 'lucide-react';
import type { Workshop } from '../../types/workshop.types';

interface WorkshopCardProps {
  workshop: Workshop;
  onStart: (workshopId: string) => void;
}

export function WorkshopCard({ workshop, onStart }: WorkshopCardProps) {
  const scheduledDate = workshop.scheduledDate
    ? new Date(workshop.scheduledDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <button
      onClick={() => onStart(workshop.id)}
      className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">
          {workshop.title || 'Canvas Workshop'}
        </h3>
        <Badge
          variant={workshop.status === 'SCHEDULED' ? 'info' : 'warning'}
          size="sm"
        >
          {workshop.status === 'SCHEDULED' ? 'Scheduled' : 'Purchased'}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        {scheduledDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {scheduledDate}
          </span>
        )}
        {workshop.scheduledTime && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {workshop.scheduledTime}
          </span>
        )}
        {workshop.hasFacilitator && (
          <Badge variant="info" size="sm" className="bg-purple-50 text-purple-700">
            <User className="w-3 h-3" />
            Facilitator
          </Badge>
        )}
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          {workshop.selectedAssetIds.length} assets
        </span>
      </div>
    </button>
  );
}
