'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IdCard, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import type { AuthorProfile } from '@/lib/landing-pages/author-profile';

// ─── Types ─────────────────────────────────────────────────

interface AuthorProfileResponse {
  authorProfile: AuthorProfile | null;
}

interface PatchBody {
  name: string;
  jobTitle?: string;
  sameAs?: string[];
}

// ─── Data Fetching ────────────────────────────────────────────

const authorProfileKeys = {
  all: ['author-profile'] as const,
};

async function fetchAuthorProfile(): Promise<AuthorProfileResponse> {
  const res = await fetch('/api/settings/author-profile');
  if (!res.ok) throw new Error('Failed to fetch author profile');
  return res.json();
}

/** Pakt een leesbare foutmelding uit de server-respons (incl. 400-validatie-details). */
async function extractError(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === 'object') {
      const obj = data as { error?: unknown; details?: unknown };
      const flat = obj.details as { formErrors?: string[]; fieldErrors?: Record<string, string[]> } | undefined;
      const field = flat?.fieldErrors
        ? Object.values(flat.fieldErrors).flat().filter(Boolean)
        : [];
      const form = flat?.formErrors?.filter(Boolean) ?? [];
      const all = [...field, ...form];
      if (all.length > 0) return all.join(' ');
      if (typeof obj.error === 'string') return obj.error;
    }
  } catch {
    // val terug op generieke melding
  }
  return 'Saving failed. Please try again.';
}

async function updateAuthorProfile(body: PatchBody): Promise<AuthorProfileResponse> {
  const res = await fetch('/api/settings/author-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────

/** Lichte client-side URL-check; de server blijft de bron van waarheid. */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────────────────

/**
 * Developer-only Settings-tab voor het GEO/SEO Fase 3 E-E-A-T author-profiel.
 *
 * Beheert de workspace-brede `Workspace.authorProfile` (naam, functietitel,
 * sameAs-identiteits-URLs) die het Person+sameAs-knooppunt in BlogPosting
 * JSON-LD voedt. Een lege naam wist het profiel op de server.
 */
export function AuthorProfileTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: authorProfileKeys.all,
    queryFn: fetchAuthorProfile,
  });

  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [sameAs, setSameAs] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Hydrateer het formulier zodra (en telkens) het opgehaalde profiel verandert.
  // De React-aanbevolen "adjust state during render"-techniek vermijdt een
  // setState-in-effect (cascading renders) — zie react.dev "You Might Not Need an Effect".
  const [hydratedFrom, setHydratedFrom] = useState<AuthorProfileResponse | null>(null);
  if (data && data !== hydratedFrom) {
    setHydratedFrom(data);
    setName(data.authorProfile?.name ?? '');
    setJobTitle(data.authorProfile?.jobTitle ?? '');
    setSameAs(data.authorProfile?.sameAs ?? []);
  }

  const mutation = useMutation({
    mutationFn: updateAuthorProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorProfileKeys.all });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = useCallback(() => {
    const cleanedUrls = sameAs.map((u) => u.trim()).filter((u) => u.length > 0);
    const body: PatchBody = {
      name: name.trim(),
      ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}),
      ...(cleanedUrls.length > 0 ? { sameAs: cleanedUrls } : {}),
    };
    mutation.mutate(body);
  }, [name, jobTitle, sameAs, mutation]);

  const updateUrl = (index: number, value: string) => {
    setSameAs((prev) => prev.map((u, i) => (i === index ? value : u)));
  };
  const addUrl = () => setSameAs((prev) => [...prev, '']);
  const removeUrl = (index: number) => setSameAs((prev) => prev.filter((_, i) => i !== index));

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading author profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-red-500 text-sm">
        Failed to load author profile. Please try again.
      </div>
    );
  }

  const filledUrls = sameAs.filter((u) => u.trim().length > 0);
  const hasInvalidUrl = filledUrls.some((u) => !isValidUrl(u));
  // Een lege naam wist het hele profiel (server-zijde). Voorkom dat dit per ongeluk
  // gebeurt wanneer er nog wél een functietitel of URL is ingevuld.
  const wouldAccidentallyWipe =
    name.trim().length === 0 && (jobTitle.trim().length > 0 || filledUrls.length > 0);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <IdCard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Author profile</h2>
        </div>
        <p className="text-sm text-gray-500">
          Feeds the Person + sameAs node in BlogPosting JSON-LD on published GEO articles — a
          strong E-E-A-T signal. Leave the name empty to remove the author entirely.
        </p>
      </div>

      <div className="space-y-6">
        {/* Naam */}
        <div>
          <label htmlFor="author-name" className="block text-sm font-medium text-gray-900 mb-1.5">
            Name
          </label>
          <input
            id="author-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Doe"
            maxLength={120}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <p className="text-xs text-gray-500 mt-1">
            Empty name clears the profile and removes the author from structured data.
          </p>
        </div>

        {/* Functietitel */}
        <div>
          <label htmlFor="author-job-title" className="block text-sm font-medium text-gray-900 mb-1.5">
            Job title <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="author-job-title"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Head of Content"
            maxLength={120}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* sameAs-URLs */}
        <div>
          <span className="block text-sm font-medium text-gray-900 mb-1.5">
            Identity URLs <span className="text-gray-400 font-normal">(optional, max 10)</span>
          </span>
          <p className="text-xs text-gray-500 mb-3">
            Verifiable profiles such as LinkedIn or a personal site. Only http(s) URLs are kept.
          </p>
          <div className="space-y-2">
            {sameAs.map((url, index) => {
              const invalid = url.trim().length > 0 && !isValidUrl(url);
              return (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder="https://www.linkedin.com/in/..."
                    className={`flex-1 text-sm border rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 ${
                      invalid
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                        : 'border-gray-200 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeUrl(index)}
                    title="Remove URL"
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          {sameAs.length < 10 && (
            <button
              type="button"
              onClick={addUrl}
              className="mt-2 flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add URL
            </button>
          )}
          {hasInvalidUrl && (
            <p className="text-xs text-red-500 mt-2">
              One or more URLs are not valid http(s) addresses.
            </p>
          )}
        </div>

        {/* Save + status */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending || hasInvalidUrl || wouldAccidentallyWipe}
            className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
          {wouldAccidentallyWipe && (
            <span className="text-sm text-amber-600">
              Enter a name, or clear the other fields to remove the profile.
            </span>
          )}
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
          {mutation.isError && (
            <span className="text-sm text-red-500">
              {mutation.error instanceof Error ? mutation.error.message : 'Saving failed.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
