'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
        <Building2 className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-none shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
        </div>
      </div>
    </div>
  );
}
