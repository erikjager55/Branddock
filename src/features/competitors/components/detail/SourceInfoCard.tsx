"use client";

import { Globe, Clock, Info } from "lucide-react";
import { Badge } from "@/components/shared";
import type { CompetitorDetail } from "../../types/competitor.types";

interface SourceInfoCardProps {
  competitor: CompetitorDetail;
}

/** Source information sidebar card */
export function SourceInfoCard({ competitor }: SourceInfoCardProps) {
  const sourceLabel = competitor.source === "WEBSITE_URL" ? "Website URL" : "Manual";
  const lastScraped = competitor.lastScrapedAt
    ? new Date(competitor.lastScrapedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-gray-500" />
        Source Info
      </h3>
      <div className="space-y-3">
        {/* Website URL */}
        {competitor.websiteUrl && (
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <a
              href={competitor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {competitor.websiteUrl}
            </a>
          </div>
        )}

        {/* Source badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Source:</span>
          <Badge variant="default">{sourceLabel}</Badge>
        </div>

        {/* Last scraped */}
        {lastScraped && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            Last analyzed: {lastScraped}
          </div>
        )}

        {/* Online presence signals */}
        {(competitor.hasBlog !== null || competitor.hasCareersPage !== null) && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Online Presence</p>
            <div className="flex flex-wrap gap-2">
              {competitor.hasBlog !== null && (
                <span className={`text-xs rounded-full px-2 py-0.5 ${competitor.hasBlog ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {competitor.hasBlog ? "Has blog" : "No blog"}
                </span>
              )}
              {competitor.hasCareersPage !== null && (
                <span className={`text-xs rounded-full px-2 py-0.5 ${competitor.hasCareersPage ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {competitor.hasCareersPage ? "Has careers page" : "No careers page"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
