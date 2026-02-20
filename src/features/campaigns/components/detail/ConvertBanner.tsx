"use client";

import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/shared";

interface ConvertBannerProps {
  onConvert: () => void;
}

export function ConvertBanner({ onConvert }: ConvertBannerProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Upgrade to a full campaign
          </p>
          <p className="text-xs text-blue-700">
            Get AI strategy, knowledge context, team collaboration, and more.
          </p>
        </div>
      </div>
      <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right" onClick={onConvert}>
        Convert to Campaign
      </Button>
    </div>
  );
}
