import { BrandAsset } from "@/generated/prisma/client";
import { Card } from "@/components/ui/Card";

interface AssetContentViewerProps {
  asset: BrandAsset;
}

export function AssetContentViewer({ asset }: AssetContentViewerProps) {
  // Logo content
  if (asset.type === "LOGO" && asset.fileUrl) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="aspect-video bg-surface-dark/50 flex items-center justify-center p-8">
          <img
            src={asset.fileUrl}
            alt={asset.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </Card>
    );
  }

  // Color palette
  if (asset.type === "COLOR" && asset.content) {
    const palette = (asset.content as any).palette || [];
    return (
      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-dark mb-4">
          Color Palette
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {palette.map((color: any, index: number) => (
            <div key={index}>
              <div
                className="aspect-square rounded-lg mb-2 border border-border-dark"
                style={{ backgroundColor: color.hex }}
              />
              <div className="text-sm">
                <p className="font-medium text-text-dark">{color.name}</p>
                <p className="text-text-dark/60 text-xs">{color.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Typography
  if (asset.type === "TYPOGRAPHY" && asset.content) {
    const fonts = (asset.content as any).fonts || [];
    return (
      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-dark mb-4">Typography</h3>
        <div className="space-y-6">
          {fonts.map((font: any, index: number) => (
            <div key={index} className="border-b border-border-dark last:border-0 pb-6 last:pb-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-medium text-text-dark">{font.family}</h4>
                <span className="text-xs text-text-dark/60 capitalize">{font.usage}</span>
              </div>
              <p
                className="text-2xl text-text-dark mb-2"
                style={{ fontFamily: font.family }}
              >
                The quick brown fox jumps over the lazy dog
              </p>
              <p className="text-xs text-text-dark/60">
                Weights: {font.weights.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Messaging
  if (asset.type === "MESSAGING" && asset.content) {
    const content = asset.content as any;
    return (
      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-dark mb-4">Messaging</h3>
        <div className="space-y-4">
          {content.tagline && (
            <div>
              <label className="text-xs font-medium text-text-dark/60 uppercase tracking-wide">
                Tagline
              </label>
              <p className="text-lg font-medium text-text-dark mt-1">
                {content.tagline}
              </p>
            </div>
          )}
          {content.missionStatement && (
            <div>
              <label className="text-xs font-medium text-text-dark/60 uppercase tracking-wide">
                Mission Statement
              </label>
              <p className="text-base text-text-dark mt-1">
                {content.missionStatement}
              </p>
            </div>
          )}
          {content.valueProposition && (
            <div>
              <label className="text-xs font-medium text-text-dark/60 uppercase tracking-wide">
                Value Proposition
              </label>
              <p className="text-base text-text-dark mt-1">
                {content.valueProposition}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Guideline or fallback
  return (
    <Card padding="md">
      <div className="prose prose-sm prose-invert max-w-none">
        {asset.description || "No content available"}
      </div>
    </Card>
  );
}
