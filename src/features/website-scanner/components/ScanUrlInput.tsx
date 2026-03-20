'use client';

import React, { useState } from 'react';
import { Globe, ArrowRight, AlertCircle } from 'lucide-react';
import { useWebsiteScannerStore } from '../stores/useWebsiteScannerStore';
import { useStartScan } from '../hooks';

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str.startsWith('http') ? str : `https://${str}`);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function ScanUrlInput() {
  const { url, setUrl, setJobId, setViewState } = useWebsiteScannerStore();
  const startScan = useStartScan();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = url.startsWith('http') ? url : `https://${url}`;
    if (!isValidUrl(normalized)) {
      setError('Please enter a valid website URL');
      return;
    }

    try {
      const result = await startScan.mutateAsync(normalized);
      setJobId(result.id);
      setViewState('scanning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <Globe className="h-7 w-7 text-teal-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Enter your website URL
        </h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          We&apos;ll scan your website and automatically extract brand information, products, audience insights, and more.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="www.your-company.com"
            className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              error ? 'border-red-300' : 'border-gray-200'
            }`}
            autoFocus
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-600" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!url.trim() || startScan.isPending}
          className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: '#0D9488' }}
        >
          {startScan.isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting scan...
            </>
          ) : (
            <>
              Start Scan
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* What we scan */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 text-center">
          What we extract
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Brand Identity', 'Products & Services', 'Target Audience', 'Competitive Signals'].map((item) => (
            <div key={item} className="text-center p-3 rounded-lg bg-gray-50">
              <span className="text-xs text-gray-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
