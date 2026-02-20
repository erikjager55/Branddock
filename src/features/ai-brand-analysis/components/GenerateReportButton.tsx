'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface GenerateReportButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function GenerateReportButton({
  onClick,
  isLoading = false,
  disabled = false,
}: GenerateReportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Generating Report...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Generate Analysis Report
        </>
      )}
    </button>
  );
}
