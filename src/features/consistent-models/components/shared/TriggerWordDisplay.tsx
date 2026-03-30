"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface TriggerWordDisplayProps {
  triggerWord: string;
}

/** Copyable trigger word display */
export function TriggerWordDisplay({ triggerWord }: TriggerWordDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(triggerWord);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono text-gray-700 hover:bg-gray-200 transition-colors"
      title="Click to copy"
    >
      <code>{triggerWord}</code>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-gray-400" />
      )}
    </button>
  );
}
