'use client';

import { Lightbulb } from 'lucide-react';

const FACILITATOR_TIPS = [
  'Encourage all participants to share their perspective — diversity of thought leads to stronger outcomes.',
  'Summarize key themes after each step before moving on to the next.',
  'Use "What I hear you saying is..." to validate contributions.',
  'If time is running short, focus on capturing the WHY — it\'s the foundation for everything else.',
  'End with clear, measurable action items that can be followed up on.',
];

interface FacilitatorTipsProps {
  currentStep: number;
}

export function FacilitatorTips({ currentStep }: FacilitatorTipsProps) {
  if (currentStep !== 6) return null;

  return (
    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">
          Facilitator Tips
        </h3>
      </div>
      <ul className="space-y-2">
        {FACILITATOR_TIPS.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
