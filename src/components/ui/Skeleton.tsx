import { cn } from "@/lib/utils";

export interface SkeletonProps {
  variant?: "text" | "circle" | "rect" | "card";
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

function SkeletonBase({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-border-dark/50",
        className
      )}
      style={style}
    />
  );
}

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  className,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  if (variant === "circle") {
    const size = width || 40;
    return (
      <SkeletonBase
        className={cn("rounded-full", className)}
        style={{
          width: typeof size === "number" ? `${size}px` : size,
          height: typeof size === "number" ? `${size}px` : size,
        }}
      />
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border-dark/30 p-4 space-y-3",
          className
        )}
        style={style}
      >
        <SkeletonBase className="h-4 w-3/4" />
        <SkeletonBase className="h-3 w-full" />
        <SkeletonBase className="h-3 w-5/6" />
      </div>
    );
  }

  if (variant === "rect") {
    return (
      <SkeletonBase
        className={cn("h-20 w-full", className)}
        style={style}
      />
    );
  }

  // text variant
  if (lines === 1) {
    return (
      <SkeletonBase
        className={cn("h-4 w-full", className)}
        style={style}
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)} style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}
