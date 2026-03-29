'use client';

import React from 'react';
import { CheckCircle, Loader2, Circle, XCircle, Globe, FileSearch, Brain, Layers, Palette, AlertTriangle } from 'lucide-react';
import { useWebsiteScannerStore } from '../stores/useWebsiteScannerStore';
import { useScanProgress, useCancelScan } from '../hooks';

const PHASES = [
  { key: 'CRAWLING', label: 'Scanning website', icon: Globe, description: 'Discovering and crawling pages' },
  { key: 'EXTRACTING', label: 'Extracting information', icon: FileSearch, description: 'Analyzing page content with AI' },
  { key: 'ANALYZING', label: 'AI analysis', icon: Brain, description: 'Strategic analysis across 4 knowledge areas' },
  { key: 'MAPPING', label: 'Mapping to your brand', icon: Layers, description: 'Converting to brand data structures' },
  { key: 'STYLING', label: 'Analyzing brand style', icon: Palette, description: 'Colors, typography & tone of voice' },
] as const;

type PhaseKey = typeof PHASES[number]['key'];

function getPhaseState(currentStatus: string, phaseKey: PhaseKey): 'done' | 'active' | 'pending' {
  const ORDER: PhaseKey[] = ['CRAWLING', 'EXTRACTING', 'ANALYZING', 'MAPPING', 'STYLING'];
  const currentIdx = ORDER.indexOf(currentStatus as PhaseKey);
  const phaseIdx = ORDER.indexOf(phaseKey);

  if (currentStatus === 'COMPLETED') return 'done';
  if (currentIdx < 0) return 'pending';
  if (phaseIdx < currentIdx) return 'done';
  if (phaseIdx === currentIdx) return 'active';
  return 'pending';
}

export function ScanProgressView() {
  const { jobId, setViewState } = useWebsiteScannerStore();
  const { data: progress } = useScanProgress(jobId);
  const cancelMutation = useCancelScan();

  React.useEffect(() => {
    if (progress?.status === 'COMPLETED') {
      setViewState('results');
    }
  }, [progress?.status, setViewState]);

  const isFailed = progress?.status === 'FAILED';
  const isCancelled = progress?.status === 'CANCELLED';
  const isRunning = !isFailed && !isCancelled && progress?.status !== 'COMPLETED';

  const handleCancel = () => {
    if (jobId) cancelMutation.mutate(jobId);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {isFailed ? 'Scan Failed' : isCancelled ? 'Scan Cancelled' : 'Scanning...'}
          </span>
          <span className="text-sm text-gray-500">{progress?.progress ?? 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isFailed ? 'bg-red-500' : isCancelled ? 'bg-gray-400' : 'bg-primary-500'
            }`}
            style={{ width: `${progress?.progress ?? 0}%` }}
          />
        </div>
      </div>

      {/* Phase list */}
      <div className="space-y-4">
        {PHASES.map((phase) => {
          const state = progress ? getPhaseState(progress.status, phase.key) : 'pending';
          const Icon = phase.icon;

          return (
            <div key={phase.key} className="flex items-start gap-3">
              <div className="mt-0.5">
                {state === 'done' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                {state === 'active' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                {state === 'pending' && <Circle className="h-5 w-5 text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${state === 'pending' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={`text-sm font-medium ${state === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
                    {phase.label}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${state === 'pending' ? 'text-gray-300' : 'text-gray-500'}`}>
                  {phase.description}
                </p>

                {/* Phase-specific details */}
                {state === 'active' && phase.key === 'CRAWLING' && progress && (
                  <div className="mt-2 text-xs text-primary-700">
                    {progress.pagesCrawled}/{progress.pagesDiscovered} pages crawled
                    {progress.currentPage && (
                      <span className="block text-gray-500 truncate mt-0.5">
                        Currently: {progress.currentPage}
                      </span>
                    )}
                  </div>
                )}
                {state === 'active' && phase.key === 'ANALYZING' && progress && (
                  <div className="mt-2 text-xs text-primary-700">
                    {progress.categoriesDone}/{progress.categoriesTotal} areas analyzed
                    {progress.currentCategory && (
                      <span className="block text-gray-500 mt-0.5">{progress.currentCategory}</span>
                    )}
                  </div>
                )}
                {phase.key === 'STYLING' && progress?.brandstyleStatus && state === 'active' && (
                  <div className="mt-2 text-xs text-primary-700">
                    {progress.brandstyleStatus}
                  </div>
                )}
                {phase.key === 'STYLING' && progress?.brandstyleError && state === 'done' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Completed with warning: {progress.brandstyleError}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error messages */}
      {(isFailed || isCancelled) && progress?.errors && progress.errors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">
              {isFailed ? 'Scan encountered errors' : 'Scan was cancelled'}
            </span>
          </div>
          {progress.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600 mt-1">{err}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-center gap-3">
        {isRunning && (
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="px-4 py-2 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            Cancel Scan
          </button>
        )}
        {(isFailed || isCancelled) && (
          <button
            onClick={() => useWebsiteScannerStore.getState().reset()}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#0D9488' }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
