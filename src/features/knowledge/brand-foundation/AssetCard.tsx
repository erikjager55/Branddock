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
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <AssetTypeIcon
              type={asset.type}
              className="w-5 h-5 text-primary"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-text-dark truncate">
              {asset.name}
            </h3>
            <p className="text-xs text-text-dark/40 truncate">
              {asset.description || "No description"}
            </p>
          </div>
          <span className="text-xs text-text-dark/40 capitalize flex-shrink-0">
            {asset.type.toLowerCase()}
          </span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <AssetStatusBadge status={asset.status} />
            <span className="text-xs text-text-dark/40">
              {formatDistanceToNow(asset.updatedAt)}
            </span>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/knowledge/brand-foundation/${asset.id}`} className="group">
      <Card hoverable padding="none" className="overflow-hidden h-full">
        {/* Thumbnail */}
        <div className="aspect-[4/3] bg-surface-dark border-b border-border-dark flex items-center justify-center relative">
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <AssetTypeIcon
              type={asset.type}
              className="w-8 h-8 text-primary"
            />
          </div>
          <div className="absolute top-3 right-3">
            <AssetStatusBadge status={asset.status} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-dark line-clamp-2 mb-1">
              {asset.name}
            </h3>
            {asset.description && (
              <p className="text-xs text-text-dark/40 line-clamp-2">
                {asset.description}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-text-dark/40 pt-2 border-t border-border-dark">
            <span>{asset.creator.name || asset.creator.email}</span>
            <span>{formatDistanceToNow(asset.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
