"use client";

import { useState } from "react";
import { Database, X } from "lucide-react";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
      <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="flex-1 text-sm text-amber-200/80">
        Showing demo data — connect your database for live data
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
