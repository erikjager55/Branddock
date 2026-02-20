'use client';

import { CheckCircle, Circle } from 'lucide-react';
import { ParticipantsGrid } from './ParticipantsGrid';
import { AgendaTimeline } from './AgendaTimeline';
import type {
  WorkshopObjective,
  WorkshopParticipant,
  WorkshopAgendaItem,
} from '../../types/workshop.types';

interface WorkshopDetailsTabProps {
  objectives: WorkshopObjective[];
  participants: WorkshopParticipant[];
  agendaItems: WorkshopAgendaItem[];
}

export function WorkshopDetailsTab({
  objectives,
  participants,
  agendaItems,
}: WorkshopDetailsTabProps) {
  const safeObjectives = Array.isArray(objectives) ? objectives : [];
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const safeAgendaItems = Array.isArray(agendaItems) ? agendaItems : [];

  return (
    <div className="space-y-6">
      {safeObjectives.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Objectives
          </h3>
          <div className="space-y-2">
            {safeObjectives.map((obj) => (
              <div
                key={obj.id}
                className="flex items-center gap-2 text-sm"
              >
                {obj.isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}
                <span className="text-gray-700">{obj.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ParticipantsGrid participants={safeParticipants} />
      <AgendaTimeline agendaItems={safeAgendaItems} />
    </div>
  );
}
