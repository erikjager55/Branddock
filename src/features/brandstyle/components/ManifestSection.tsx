"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import type { BrandManifest } from "@/lib/brandstyle/manifest-builder";

interface ManifestResponse {
  manifest: BrandManifest;
  markdown: string;
  generatedAt?: string | null;
  version: number;
}

interface ManifestSectionProps {
  canEdit: boolean;
}

/**
 * Digest-view van het Brand Manifest (designbibliotheek-verbeterplan W1).
 * Toont exact hetzelfde document dat getBrandContext injecteert —
 * "what you see is what the AI gets".
 */
export function ManifestSection({ canEdit }: ManifestSectionProps) {
  const { t } = useTranslation("brandstyle");
  const [data, setData] = useState<ManifestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notGenerated, setNotGenerated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brandstyle/manifest");
      if (res.status === 404) {
        setNotGenerated(true);
        setData(null);
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      } else {
        setData((await res.json()) as ManifestResponse);
        setNotGenerated(false);
      }
    } catch {
      setError(t("manifest.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const regenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/brandstyle/manifest", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ManifestResponse);
      setNotGenerated(false);
    } catch {
      setError(t("manifest.generateError"));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">{t("manifest.loading")}</div>;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button onClick={() => void load()} className="text-sm text-primary underline">
          {t("manifest.retry")}
        </button>
      </div>
    );
  }

  if (notGenerated || !data) {
    return (
      <div className="py-16 text-center">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-4" />
        <p className="text-sm text-gray-600 mb-4">{t("manifest.empty")}</p>
        {canEdit && (
          <button
            onClick={() => void regenerate()}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {t("manifest.generate")}
          </button>
        )}
      </div>
    );
  }

  const { manifest } = data;
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("manifest.title")} <span className="text-gray-400 font-normal">v{data.version}</span>
          </h2>
          <p className="text-sm text-gray-500">{t("manifest.subtitle")}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => void regenerate()}
            disabled={generating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {t("manifest.regenerate")}
          </button>
        )}
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("manifest.quickFacts")}</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          {manifest.quickFacts.map((fact) => (
            <div key={fact.label} className="flex gap-2 text-sm py-1 border-b border-gray-100">
              <dt className="text-gray-500 min-w-32">{fact.label}</dt>
              <dd className="text-gray-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {manifest.hardRules.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("manifest.rules")}</h3>
          <ul className="space-y-2">
            {manifest.hardRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                    rule.severity === "BLOCKING"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {rule.severity === "BLOCKING" ? t("manifest.blocking") : t("manifest.advisory")}
                </span>
                <span className="text-gray-800">
                  {rule.text}
                  {rule.source === "recommended" && (
                    <span className="ml-1 text-xs text-gray-400">({t("manifest.recommended")})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {manifest.voiceBaseline && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("manifest.voice")}</h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-4">
            {manifest.voiceBaseline}
          </pre>
        </section>
      )}

      {manifest.substitutions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            {t("manifest.substitutions")}
          </h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {manifest.substitutions.map((sub, i) => (
              <li key={i}>• {sub.text}</li>
            ))}
          </ul>
        </section>
      )}

      {manifest.knownGaps.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {t("manifest.knownGaps")}
          </h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {manifest.knownGaps.map((gap, i) => (
              <li key={i}>• {gap}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("manifest.agentView")}</h3>
        <p className="text-xs text-gray-500 mb-2">{t("manifest.agentViewHint")}</p>
        <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          {data.markdown}
        </pre>
      </section>
    </div>
  );
}
