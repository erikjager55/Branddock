'use client';

import { cn } from '@/components/ui/utils';

interface GoldenCircleData {
  type: string;
  why?: { statement: string; details?: string };
  how?: { statement: string; details?: string };
  what?: { statement: string; details?: string };
}

interface CanvasFrameworkRendererProps {
  canvasData: Record<string, unknown> | null;
}

const SECTIONS: {
  key: 'why' | 'how' | 'what';
  label: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
}[] = [
  {
    key: 'why',
    label: 'WHY',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
  },
  {
    key: 'how',
    label: 'HOW',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
  },
  {
    key: 'what',
    label: 'WHAT',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
  },
];

export function CanvasFrameworkRenderer({
  canvasData,
}: CanvasFrameworkRendererProps) {
  if (!canvasData) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No canvas data available yet.
      </div>
    );
  }

  const data = canvasData as unknown as GoldenCircleData;

  return (
    <div className="space-y-4">
      {SECTIONS.map(({ key, label, borderColor, bgColor, textColor }) => {
        const section = data[key];
        if (!section) return null;

        return (
          <div
            key={key}
            className={cn(
              'border-l-4 rounded-lg p-4',
              borderColor,
              bgColor,
            )}
          >
            <h4 className={cn('text-sm font-bold mb-2', textColor)}>
              {label}
            </h4>
            <p className="text-sm text-gray-800 font-medium">
              &ldquo;{section.statement}&rdquo;
            </p>
            {section.details && (
              <p className="text-xs text-gray-600 mt-2">{section.details}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
