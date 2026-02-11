"use client";

import { useState } from "react";
import { X, Plus, Lightbulb } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useInterviewStore } from "@/stores/interviewStore";
import { QUESTION_TYPE_OPTIONS } from "@/lib/constants/interview-templates";
import { cn } from "@/lib/utils";

export interface InterviewQuestion {
  id: string;
  questionText: string;
  questionType: string;
  assetLink: string;
  options?: string[];
  source: "CUSTOM" | "TEMPLATE";
  savedToLibrary: boolean;
}

interface AddQuestionModalProps {
  assetOptions: { value: string; label: string }[];
  onAdd: (question: InterviewQuestion) => void;
}

export function AddQuestionModal({ assetOptions, onAdd }: AddQuestionModalProps) {
  const { isAddQuestionModalOpen, closeAddQuestionModal, defaultAssetForQuestion, openTemplatesPanel } =
    useInterviewStore();

  const [assetLink, setAssetLink] = useState(defaultAssetForQuestion ?? "general");
  const [questionType, setQuestionType] = useState("OPEN");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const needsOptions = ["MULTIPLE_CHOICE", "MULTI_SELECT", "RANKING"].includes(questionType);

  const handleAdd = () => {
    if (!questionText.trim()) return;

    onAdd({
      id: `q-${Date.now()}`,
      questionText: questionText.trim(),
      questionType,
      assetLink,
      options: needsOptions ? options.filter((o) => o.trim()) : undefined,
      source: "CUSTOM",
      savedToLibrary: saveToLibrary,
    });

    // Reset form
    setQuestionText("");
    setQuestionType("OPEN");
    setOptions(["", ""]);
    setSaveToLibrary(false);
    closeAddQuestionModal();
  };

  const handleBrowseTemplates = () => {
    closeAddQuestionModal();
    openTemplatesPanel(assetLink !== "general" ? assetLink : undefined);
  };

  const allAssetOptions = [{ value: "general", label: "General Question" }, ...assetOptions];

  return (
    <Modal
      open={isAddQuestionModalOpen}
      onClose={closeAddQuestionModal}
      title="Add Interview Question"
      description="Create a custom question for this interview"
      size="lg"
    >
      <div className="space-y-5">
        {/* Asset Link */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-dark">
            Link to Brand Asset (optional)
          </label>
          <select
            value={assetLink}
            onChange={(e) => setAssetLink(e.target.value)}
            className="h-10 w-full rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
          >
            {allAssetOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-dark/40">
            Questions linked to assets help validate specific brand elements
          </p>
        </div>

        {/* Question Type */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-dark">
            Question Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {QUESTION_TYPE_OPTIONS.map((qt) => (
              <button
                key={qt.value}
                type="button"
                onClick={() => setQuestionType(qt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all text-left",
                  questionType === qt.value
                    ? "border-primary bg-primary/5 text-text-dark"
                    : "border-border-dark text-text-dark/60 hover:border-border-dark/80"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    questionType === qt.value ? "bg-primary" : "bg-border-dark"
                  )}
                />
                {qt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question Text */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-dark">
            Question
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter your question..."
            rows={3}
            className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Answer Options (conditional) */}
        {needsOptions && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-dark">
              Answer Options
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const updated = [...options];
                    updated[i] = e.target.value;
                    setOptions(updated);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 h-9 rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="p-1.5 rounded-md text-text-dark/30 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setOptions([...options, ""])}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Option
            </button>
          </div>
        )}

        {/* Inspiration */}
        <div className="flex items-center gap-3 rounded-lg bg-surface-dark/50 border border-border-dark p-3">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-text-dark/60">Looking for inspiration? </span>
            <button
              onClick={handleBrowseTemplates}
              className="text-sm text-primary hover:underline font-medium"
            >
              Browse question templates
            </button>
          </div>
        </div>

        {/* Save to Library */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-colors",
              saveToLibrary ? "bg-primary border-primary" : "border-border-dark"
            )}
            onClick={() => setSaveToLibrary(!saveToLibrary)}
          >
            {saveToLibrary && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-text-dark/70">Save to my Question Library for reuse</span>
        </label>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border-dark">
        <Button variant="ghost" onClick={closeAddQuestionModal}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleAdd} disabled={!questionText.trim()}>
          Add Question
        </Button>
      </div>
    </Modal>
  );
}
