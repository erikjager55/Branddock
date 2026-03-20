'use client';

import React from 'react';
import { useWebsiteScannerStore } from '../stores/useWebsiteScannerStore';
import { ScanUrlInput } from './ScanUrlInput';
import { ScanProgressView } from './ScanProgressView';
import { ScanResultsView } from './ScanResultsView';
import { ScanApplyModal } from './ScanApplyModal';
import { Globe, ArrowLeft } from 'lucide-react';

interface WebsiteScannerPageProps {
  onNavigate: (section: string) => void;
}

export function WebsiteScannerPage({ onNavigate }: WebsiteScannerPageProps) {
  const { viewState, isApplyModalOpen, closeApplyModal, jobId, reset } = useWebsiteScannerStore();

  const handleBack = () => {
    reset();
    onNavigate('dashboard');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <Globe className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Website Scanner</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Scan your website to auto-populate your brand profile
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewState === 'input' && <ScanUrlInput />}
      {viewState === 'scanning' && <ScanProgressView />}
      {viewState === 'results' && <ScanResultsView onNavigate={onNavigate} />}
      {viewState === 'applied' && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Results Applied!</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Your brand profile has been populated with the scan results. Explore your brand foundation to review and refine.
          </p>

          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => onNavigate('brand')}
              className="px-6 py-2.5 text-white text-sm font-medium rounded-lg"
              style={{ backgroundColor: '#0D9488' }}
            >
              Go to Brand Foundation
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-2.5 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {isApplyModalOpen && jobId && (
        <ScanApplyModal onNavigate={onNavigate} />
      )}
    </div>
  );
}
