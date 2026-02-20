'use client';

import { Target, Compass, Package, Pencil, ArrowRight } from 'lucide-react';
import type { GoldenCircleData, GoldenCircleRing } from '../types/golden-circle.types';

const RINGS: {
  key: GoldenCircleRing;
  label: string;
  sublabel: string;
  icon: typeof Target;
  border: string;
  bg: string;
  text: string;
}[] = [
  {
    key: 'why',
    label: 'WHY',
    sublabel: 'Purpose',
    icon: Target,
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  {
    key: 'how',
    label: 'HOW',
    sublabel: 'Process',
    icon: Compass,
    border: 'border-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  {
    key: 'what',
    label: 'WHAT',
    sublabel: 'Product',
    icon: Package,
    border: 'border-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
];

interface GoldenCircleCanvasProps {
  data: GoldenCircleData;
  isLocked: boolean;
  onEdit: (ring: GoldenCircleRing) => void;
}

export function GoldenCircleCanvas({ data, isLocked, onEdit }: GoldenCircleCanvasProps) {
  const getStatement = (ring: GoldenCircleRing) => {
    switch (ring) {
      case 'why': return data.whyStatement;
      case 'how': return data.howStatement;
      case 'what': return data.whatStatement;
    }
  };

  const getDetails = (ring: GoldenCircleRing) => {
    switch (ring) {
      case 'why': return data.whyDetails;
      case 'how': return data.howDetails;
      case 'what': return data.whatDetails;
    }
  };

  return (
    <div>
      <div className="space-y-4">
        {RINGS.map(({ key, label, sublabel, icon: Icon, border, bg, text }) => {
          const statement = getStatement(key);
          const details = getDetails(key);

          return (
            <div
              key={key}
              className={`border-l-4 rounded-r-lg p-5 ${border} ${bg} relative group`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${text}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${text}`}>
                    {label} &middot; {sublabel}
                  </span>
                </div>
                {!isLocked && (
                  <button
                    onClick={() => onEdit(key)}
                    className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              {statement ? (
                <>
                  <p className="font-medium text-gray-900">{statement}</p>
                  {details && (
                    <p className="text-sm text-gray-600 mt-1 italic">&ldquo;{details}&rdquo;</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {isLocked ? 'No content yet' : 'Click to add content...'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Flow indicator */}
      <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-400">
        <ArrowRight className="w-4 h-4" />
        <span>Inside-Out: Start with WHY, then HOW, then WHAT</span>
      </div>
    </div>
  );
}
