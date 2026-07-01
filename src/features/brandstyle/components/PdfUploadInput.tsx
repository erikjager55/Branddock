"use client";

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, X } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { useAnalyzePdf } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";

export function PdfUploadInput() {
  const { t } = useTranslation("brandstyle");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzePdf = useAnalyzePdf();
  const { startAnalysis } = useBrandstyleStore();

  const handleFile = (f: File) => {
    setError(null);
    if (!f.name.endsWith(".pdf")) {
      setError(t("pdfInput.errorNotPdf"));
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError(t("pdfInput.errorTooLarge"));
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleAnalyze = () => {
    if (!file) return;
    analyzePdf.mutate(file, {
      onSuccess: (data) => {
        startAnalysis(data.jobId);
      },
      onError: () => {
        setError(t("errors.startAnalysis"));
      },
    });
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FileText className="w-4 h-4" />
          {t("pdfInput.label")}
        </div>

        {!file ? (
          <div
            data-testid="pdf-upload-area"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-primary-400 bg-primary-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              {t("pdfInput.dropText")}
            </p>
            <p className="text-xs text-gray-400">{t("pdfInput.dropHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {file && (
          <Button
            variant="primary"
            fullWidth
            onClick={handleAnalyze}
            isLoading={analyzePdf.isPending}
          >
            {t("pdfInput.analyzeButton")}
          </Button>
        )}
      </div>
    </Card>
  );
}
