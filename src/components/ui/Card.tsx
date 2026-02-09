"use client";

import { cn } from "@/lib/utils";

export interface CardProps {
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  clickable?: boolean;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  padding = "md",
  hoverable = false,
  clickable = false,
  selected = false,
  className,
  children,
  onClick,
}: CardProps) {
  const Component = clickable ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-surface-dark shadow-sm transition-all duration-200",
        selected ? "border-primary" : "border-border-dark",
        hoverable && "hover:shadow-md hover:-translate-y-0.5",
        clickable && "cursor-pointer text-left w-full",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </Component>
  );
}

function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "pb-3 border-b border-border-dark mb-3",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(className)}>{children}</div>;
}

function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "pt-3 border-t border-border-dark mt-3 flex items-center gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
