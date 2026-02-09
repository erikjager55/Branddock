"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AssetTypeIcon } from "./AssetTypeIcon";
import { BrandAsset } from "@/generated/prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

interface RelatedAssetsCarouselProps {
  assets: BrandAsset[];
}

export function RelatedAssetsCarousel({ assets }: RelatedAssetsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (assets.length === 0) {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm text-text-dark/60">
          No related assets yet. Add relationships to connect this asset with
          others.
        </p>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* Scroll buttons */}
      {assets.length > 3 && (
        <>
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center hover:bg-primary hover:border-primary transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-text-dark" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center hover:bg-primary hover:border-primary transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-text-dark" />
          </button>
        </>
      )}

      {/* Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {assets.map((asset) => (
          <Link
            key={asset.id}
            href={`/knowledge/brand-foundation/${asset.id}`}
            className="flex-shrink-0 w-64"
          >
            <Card hoverable padding="none" className="overflow-hidden">
              <div className="aspect-[4/3] bg-surface-dark border-b border-border-dark flex items-center justify-center">
                {asset.fileUrl ? (
                  <img
                    src={asset.fileUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AssetTypeIcon
                    type={asset.type}
                    className="w-10 h-10 text-text-dark/30"
                  />
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <AssetTypeIcon
                    type={asset.type}
                    className="w-4 h-4 text-text-dark/40 flex-shrink-0 mt-0.5"
                  />
                  <h4 className="text-sm font-medium text-text-dark line-clamp-2">
                    {asset.name}
                  </h4>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
