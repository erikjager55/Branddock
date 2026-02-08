"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Focus confirm button on open
      const timer = setTimeout(() => confirmRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="flex gap-4">
        {variant === "danger" && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-text-dark">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-text-dark/60">{description}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button
          ref={confirmRef}
          variant={variant === "danger" ? "destructive" : "primary"}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
