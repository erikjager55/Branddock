"use client";

import { create } from "zustand";

export interface Toast {
  id: string;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type AddToast = Omit<Toast, "id">;

interface ToastState {
  toasts: Toast[];
  addToast: (toast: AddToast) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => {
      const id = crypto.randomUUID();
      const newToasts = [...state.toasts, { ...toast, id }];
      // Max 3 visible
      return { toasts: newToasts.slice(-3) };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function useToast() {
  const { addToast, removeToast, toasts } = useToastStore();

  return {
    toasts,
    toast: (toast: AddToast) => addToast(toast),
    dismiss: (id: string) => removeToast(id),
    success: (title: string, description?: string) =>
      addToast({ variant: "success", title, description }),
    error: (title: string, description?: string) =>
      addToast({ variant: "error", title, description }),
    warning: (title: string, description?: string) =>
      addToast({ variant: "warning", title, description }),
    info: (title: string, description?: string) =>
      addToast({ variant: "info", title, description }),
  };
}
