'use client';

import { useState, useCallback } from 'react';
import { Link, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useImportFromUrl } from '../../hooks';
import { MEDIA_CATEGORY_CONFIG } from '../../constants/media-constants';
import type { MediaCategory, ImportUrlBody } from '../../types/media.types';

/**
 * URL import form for the Media Library upload modal.
 * Allows importing media from an external URL with optional name and category.
 */
export function UrlImportTab() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MediaCategory | ''>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const importFromUrl = useImportFromUrl();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSuccessMessage(null);

      const body: ImportUrlBody = { url: url.trim() };
      if (name.trim()) body.name = name.trim();
      if (category) body.category = category as MediaCategory;

      importFromUrl.mutate(body, {
        onSuccess: () => {
          setSuccessMessage('Imported successfully!');
          setUrl('');
          setName('');
          setCategory('');
        },
      });
    },
    [url, name, category, importFromUrl]
  );

  const isDisabled = !url.trim() || importFromUrl.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* URL field */}
      <div>
        <label htmlFor="import-url" className="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Link className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="import-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSuccessMessage(null);
            }}
            placeholder="https://example.com/image.jpg"
            className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Optional name field */}
      <div>
        <label htmlFor="import-name" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="import-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My imported media"
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
        />
      </div>

      {/* Optional category select */}
      <div>
        <label htmlFor="import-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <select
          id="import-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as MediaCategory | '')}
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
        >
          <option value="">Select a category...</option>
          {Object.entries(MEDIA_CATEGORY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {importFromUrl.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            {importFromUrl.error instanceof Error
              ? importFromUrl.error.message
              : 'Failed to import from URL. Please check the URL and try again.'}
          </p>
        </div>
      )}

      {/* Success state */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-700">{successMessage}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isDisabled}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {importFromUrl.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          'Import from URL'
        )}
      </button>
    </form>
  );
}

export default UrlImportTab;
