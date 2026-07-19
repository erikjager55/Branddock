'use client';

// V2-09: kopieerbaar code-block met copy-knop — agentic bezoekers verwachten
// de connector-URL niet als lopende tekst maar als klikbaar element.
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyBlock({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Fail-soft: zonder clipboard-permissie (strenge browsers/embeds) blijft de
    // tekst select-all-baar; de knop bevestigt dan alsnog de selectie-intentie.
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // genegeerd — value staat selecteerbaar naast de knop
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code
        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono text-gray-800 select-all"
        style={{ wordBreak: 'break-all' }}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={label ?? 'Kopieer'}
        className="inline-flex items-center gap-2 rounded-lg mkt-btn-primary px-3 py-2.5 text-sm font-medium flex-shrink-0"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Gekopieerd' : 'Kopieer'}
      </button>
    </div>
  );
}
