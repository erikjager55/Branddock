'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('website-scanner');
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
          {t('page.back')}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('page.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('page.subtitle')}
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('applied.title')}</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {t('applied.description')}
          </p>

          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => onNavigate('brand')}
              className="px-6 py-2.5 text-white text-sm font-medium rounded-lg"
              style={{ backgroundColor: '#0D9488' }}
            >
              {t('applied.goToBrand')}
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-2.5 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              {t('page.back')}
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
