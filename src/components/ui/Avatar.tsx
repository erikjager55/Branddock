"use client";

import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const statusSizes = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-3.5 h-3.5",
  xl: "w-4 h-4",
};

const statusColors = {
  online: "bg-emerald-400",
  offline: "bg-slate-400",
  busy: "bg-red-400",
};

const bgColors = [
  "bg-primary",
  "bg-blue-600",
  "bg-purple-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bgColors[Math.abs(hash) % bgColors.length];
}

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: keyof typeof sizeClasses;
  status?: keyof typeof statusColors;
  className?: string;
}

export function Avatar({
  src,
  name = "",
  size = "md",
  status,
  className,
}: AvatarProps) {
  const initials = getInitials(name || "?");
  const bgColor = getColorFromName(name);

  return (
    <div className={cn("relative inline-flex flex-shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover",
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-medium text-white",
            sizeClasses[size],
            bgColor
          )}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-surface-dark",
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
