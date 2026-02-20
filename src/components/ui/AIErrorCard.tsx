'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AIErrorCardProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function AIErrorCard({ message, onRetry, isRetrying }: AIErrorCardProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-2">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-800">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Even geduld, opnieuw proberen...
                </>
              ) : (
                'Opnieuw proberen'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
