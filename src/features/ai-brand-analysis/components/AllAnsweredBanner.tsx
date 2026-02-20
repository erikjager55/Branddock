'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';

export function AllAnsweredBanner() {
  return (
    <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-emerald-800">
          All questions answered!
        </p>
        <p className="text-xs text-emerald-600 mt-0.5">
          You can continue answering for deeper insights, or generate your analysis report.
        </p>
      </div>
    </div>
  );
}
