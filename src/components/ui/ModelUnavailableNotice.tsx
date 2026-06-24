'use client';

import { RefreshCw, WifiOff } from 'lucide-react';

import { type AIErrorType } from '@/lib/ai/error-handler';
import { getUnavailableMessage } from '@/lib/ai/ai-error-client';

interface ModelUnavailableNoticeProps {
  /** Drives the per-type copy (auth vs rate-limit vs generic offline). */
  errorType?: AIErrorType;
  /** When false, the retry button is hidden (e.g. authentication errors). */
  retryable?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Inline block shown when the AI model itself cannot be reached and
 * generation is impossible. Deliberately red + WifiOff so it reads as
 * an infrastructure problem, distinct from the amber AIErrorCard used
 * for generic/validation failures.
 */
export function ModelUnavailableNotice({
  errorType = 'overloaded',
  retryable = true,
  onRetry,
  isRetrying,
}: ModelUnavailableNoticeProps) {
  const { title, body } = getUnavailableMessage({
    unavailable: true,
    errorType,
    message: '',
    retryable,
  });

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-2" role="alert">
      <div className="flex items-start gap-3">
        <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{title}</p>
          <p className="mt-1 text-sm text-red-700">{body}</p>
          {retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2 text-sm font-medium text-primary hover:text-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Retrying…
                </>
              ) : (
                'Try again'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
