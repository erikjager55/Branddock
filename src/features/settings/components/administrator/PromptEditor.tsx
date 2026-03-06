'use client';

import { useRef } from 'react';
import { RotateCcw } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface TemplateVariable {
  variable: string;
  description: string;
}

interface PromptEditorProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  variables: TemplateVariable[];
  rows?: number;
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
  /** Called when user clicks "Load default prompt" */
  onLoadDefault?: () => void;
  maxLength?: number;
}

// ─── Component ──────────────────────────────────────────────

export function PromptEditor({
  label,
  description,
  value,
  onChange,
  variables,
  rows = 8,
  placeholder,
  required = false,
  hasError = false,
  onLoadDefault,
  maxLength = 20000,
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  // Save selection on blur/select so we know where to insert when clicking a chip
  const saveSelection = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      selectionRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start, end } = selectionRef.current;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newValue = `${before}${variable}${after}`;
    onChange(newValue);

    // Restore cursor position after the inserted variable
    const newPos = start + variable.length;
    selectionRef.current = { start: newPos, end: newPos };
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">{label}</span>
              {required && !value.trim() && (
                <span className="text-[10px] text-red-400 font-medium">required</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
          {onLoadDefault && (
            <button
              type="button"
              onClick={onLoadDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Default
            </button>
          )}
        </div>
      </div>

      {/* Variable chips */}
      <div className="px-4 py-2 border-b border-gray-100 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {variables.map((v) => (
            <button
              key={v.variable}
              type="button"
              onClick={() => insertVariable(v.variable)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-medium bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 transition-colors"
              title={v.description}
            >
              {v.variable}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={saveSelection}
        onSelect={saveSelection}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`w-full px-4 py-3 text-xs font-mono border-0 resize-y focus:outline-none focus:ring-0 ${
          hasError ? 'bg-red-50' : 'bg-white'
        }`}
      />

      {/* Footer with character count */}
      <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50 flex justify-end">
        <span className={`text-[10px] ${value.length > maxLength * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
          {value.length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
