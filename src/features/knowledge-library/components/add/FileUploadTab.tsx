'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useUploadFile } from '../../hooks';
import { UPLOAD_FORMATS } from '../../constants/library-constants';

interface FileUploadTabProps {
  onClose: () => void;
}

export function FileUploadTab({ onClose }: FileUploadTabProps) {
  const uploadFile = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    uploadFile.mutateAsync(file).then(() => {
      onClose();
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="py-6 px-4">
      <div
        data-testid="file-upload-zone"
        className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center cursor-pointer transition-colors ${
          isDragging ? 'border-green-500 bg-green-50' : 'border-green-400'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Upload className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          {uploadFile.isPending ? 'Uploading...' : 'Click to upload or drag and drop'}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
          {UPLOAD_FORMATS.map((fmt) => (
            <span
              key={fmt}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {fmt}
            </span>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Maximum file size: 50MB
        </p>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={UPLOAD_FORMATS.map((f) => `.${f.toLowerCase()}`).join(',')}
        />
      </div>
    </div>
  );
}
