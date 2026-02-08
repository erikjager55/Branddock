"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast, type Toast as ToastType } from "@/hooks/useToast";

const variantConfig = {
  success: {
    icon: CheckCircle,
    className: "border-emerald-500/30",
    iconClass: "text-emerald-400",
    progressClass: "bg-emerald-400",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-500/30",
    iconClass: "text-red-400",
    progressClass: "bg-red-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/30",
    iconClass: "text-amber-400",
    progressClass: "bg-amber-400",
  },
  info: {
    icon: Info,
    className: "border-blue-500/30",
    iconClass: "text-blue-400",
    progressClass: "bg-blue-400",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastType;
  onDismiss: (id: string) => void;
}) {
  const duration = toast.duration ?? 5000;
  const [progress, setProgress] = useState(100);
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [toast.id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={cn(
        "relative w-80 overflow-hidden rounded-lg border bg-surface-dark shadow-lg",
        config.className
      )}
    >
      <div className="flex gap-3 p-4">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconClass)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-dark">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm text-text-dark/60">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-primary hover:text-primary-400 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 text-text-dark/40 hover:text-text-dark transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-border-dark/30">
        <div
          className={cn("h-full transition-none", config.progressClass)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

export function ToastProvider() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
