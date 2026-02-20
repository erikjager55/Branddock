'use client';

import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/shared';

interface HowToUseSectionProps {
  howToUse: string[];
  onUseCampaign: () => void;
  onGenerateContent: () => void;
}

export function HowToUseSection({ howToUse, onUseCampaign, onGenerateContent }: HowToUseSectionProps) {
  if (howToUse.length === 0) return null;

  return (
    <div className="bg-green-50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">How to use this insight</h3>
      </div>

      <ul className="space-y-2 mb-5">
        {howToUse.map((tip, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <span className="text-sm text-gray-700">{tip}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <Button onClick={onUseCampaign}>Use in Campaign</Button>
        <Button variant="secondary" onClick={onGenerateContent}>
          Generate Content
        </Button>
      </div>
    </div>
  );
}
