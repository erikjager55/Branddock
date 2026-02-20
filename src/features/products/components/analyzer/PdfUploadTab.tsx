"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/shared";
import { useAnalyzePdf } from "../../hooks";
import { useProductsStore } from "../../stores/useProductsStore";
import { WhatWeExtractGrid } from "./WhatWeExtractGrid";

interface PdfUploadTabProps {
  onNavigateToDetail: (id: string) => void;
}

export function PdfUploadTab({ onNavigateToDetail }: PdfUploadTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzePdf = useAnalyzePdf();
  const { setProcessingModalOpen, setAnalyzeResultData } = useProductsStore();

  const handleFile = (f: File) => {
    setError(null);
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB");
      return;
    }
    setFile(f);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleUpload = () => {
    if (!file) return;

    analyzePdf.mutate(file, {
      onSuccess: (data) => {
        setAnalyzeResultData(data);
        setProcessingModalOpen(true);
      },
      onError: () => {
        setError("Failed to start analysis. Please try again.");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Drag & drop zone */}
      {!file ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragging
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-green-400"
          }`}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">
            Drop PDF here or{" "}
            <span className="font-medium text-green-600">click to browse</span>
          </p>
          <p className="text-xs text-gray-400">PDF &bull; Max 10MB</p>
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
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
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
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {file && (
        <Button
          variant="cta"
          icon={Upload}
          onClick={handleUpload}
          isLoading={analyzePdf.isPending}
        >
          Analyze PDF
        </Button>
      )}

      <WhatWeExtractGrid />
    </div>
  );
}
