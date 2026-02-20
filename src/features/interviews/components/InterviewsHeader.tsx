'use client';

import { Button } from '@/components/shared';
import { ChevronLeft, Users, Plus } from 'lucide-react';

interface InterviewsHeaderProps {
  interviewCount: number;
  onBack: () => void;
  onAdd: () => void;
}

export function InterviewsHeader({
  interviewCount,
  onBack,
  onAdd,
}: InterviewsHeaderProps) {
  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Asset
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
            <p className="text-sm text-gray-500">
              Conduct structured interviews with stakeholders
            </p>
          </div>
          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {interviewCount} Interviews
          </span>
        </div>
        <Button variant="cta" size="md" icon={Plus} onClick={onAdd}>
          Add Interview
        </Button>
      </div>
    </div>
  );
}
