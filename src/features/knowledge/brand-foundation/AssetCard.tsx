import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AssetTypeIcon } from "./AssetTypeIcon";
import { AssetStatusBadge } from "./AssetStatusBadge";
import { BrandAssetWithRelations } from "@/types/brand-asset";
import { formatDistanceToNow } from "@/lib/utils/date";

interface AssetCardProps {
  asset: BrandAssetWithRelations;
  view?: "grid" | "list";
}

export function AssetCard({ asset, view = "grid" }: AssetCardProps) {
  if (view === "list") {
    return (
      <Link href={`/knowledge/brand-foundation/${asset.id}`}>
        <Card hoverable padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0">
            <AssetTypeIcon
              type={asset.type}
              className="w-6 h-6 text-text-dark/60"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-text-dark truncate">
              {asset.name}
            </h3>
            <p className="text-sm text-text-dark/60 truncate">
              {asset.description || "No description"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <AssetStatusBadge status={asset.status} />
            <span className="text-sm text-text-dark/40">
              Updated {formatDistanceToNow(asset.updatedAt)}
            </span>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/knowledge/brand-foundation/${asset.id}`}>
      <Card hoverable padding="none" className="overflow-hidden h-full">
        {/* Thumbnail */}
        <div className="aspect-[4/3] bg-surface-dark border-b border-border-dark flex items-center justify-center relative">
          {asset.fileUrl ? (
            <img
              src={asset.fileUrl}
              alt={asset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <AssetTypeIcon
              type={asset.type}
              className="w-12 h-12 text-text-dark/30"
            />
          )}
          <div className="absolute top-2 right-2">
            <AssetStatusBadge status={asset.status} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-2 mb-2">
            <AssetTypeIcon
              type={asset.type}
              className="w-4 h-4 text-text-dark/40 flex-shrink-0 mt-0.5"
            />
            <h3 className="text-sm font-medium text-text-dark line-clamp-2 flex-1">
              {asset.name}
            </h3>
          </div>
          {asset.description && (
            <p className="text-sm text-text-dark/60 line-clamp-2 mb-3">
              {asset.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-text-dark/40">
            <span>{asset.creator.name || asset.creator.email}</span>
            <span>{formatDistanceToNow(asset.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
