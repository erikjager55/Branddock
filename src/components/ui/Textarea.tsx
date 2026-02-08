"use client";

import { forwardRef, useRef, useEffect, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  maxLength?: number;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      maxLength,
      autoResize = false,
      value,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => internalRef.current!);

    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const charCount =
      typeof value === "string" ? value.length : 0;

    useEffect(() => {
      if (autoResize && internalRef.current) {
        internalRef.current.style.height = "auto";
        internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
      }
    }, [value, autoResize]);

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-dark"
          >
            {label}
          </label>
        )}
        <textarea
          ref={internalRef}
          id={inputId}
          value={value}
          maxLength={maxLength}
          onChange={onChange}
          className={cn(
            "w-full min-h-[80px] rounded-md border bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            error ? "border-red-500 focus:ring-red-500" : "border-border-dark",
            autoResize && "resize-none overflow-hidden",
            className
          )}
          {...props}
        />
        <div className="flex justify-between">
          <div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!error && helperText && (
              <p className="text-sm text-text-dark/50">{helperText}</p>
            )}
          </div>
          {maxLength && (
            <p
              className={cn(
                "text-sm",
                charCount >= maxLength
                  ? "text-red-500"
                  : "text-text-dark/50"
              )}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
