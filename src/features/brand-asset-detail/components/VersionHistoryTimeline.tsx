"use client";

import { History, User } from "lucide-react";
import { Card, Skeleton } from "@/components/shared";
import { useAssetVersions } from "../hooks/useBrandAssetDetail";

interface VersionHistoryTimelineProps {
  assetId: string;
}

export function VersionHistoryTimeline({
  assetId,
}: VersionHistoryTimelineProps) {
  const { data, isLoading } = useAssetVersions(assetId);

  if (isLoading) {
    return (
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-900">
            Version History
          </h2>
        </Card.Header>
        <Card.Body>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card.Body>
      </Card>
    );
  }

  const versions = data?.versions ?? [];

  if (versions.length === 0) {
    return null;
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Version History
          </h2>
          <span className="text-sm text-gray-500">
            ({data?.total ?? versions.length})
          </span>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="space-y-0">
          {versions.map((v, index) => (
            <div
              key={v.id}
              className="flex gap-3 py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index === 0
                      ? "bg-teal-100 text-teal-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  v{v.version}
                </div>
                {index < versions.length - 1 && (
                  <div className="w-px h-full bg-gray-200 mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {v.changeNote ?? `Version ${v.version}`}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{v.changedBy.name ?? v.changedBy.email}</span>
                  <span>·</span>
                  <span>
                    {new Date(v.createdAt).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}
