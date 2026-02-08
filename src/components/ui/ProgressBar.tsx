import { cn } from "@/lib/utils";

const variantColors = {
  default: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export interface ProgressBarProps {
  value: number;
  variant?: keyof typeof variantColors;
  size?: keyof typeof sizeClasses;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  variant = "default",
  size = "md",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-text-dark/60">Progress</span>
          <span className="text-sm font-medium text-text-dark">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-border-dark/50 overflow-hidden",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantColors[variant]
          )}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
