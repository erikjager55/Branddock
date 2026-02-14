import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const cardVariants = cva(
  "bg-white text-card-foreground flex flex-col rounded-xl border shadow-sm transition-all",
  {
    variants: {
      variant: {
        default: "border-border",
        interactive: "border-border hover:shadow-md hover:border-primary/30 cursor-pointer",
        highlighted: "border-2 border-primary/30 bg-primary/5",
        success: "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
        warning: "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800",
        error: "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800",
        info: "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800",
        gradient: "border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20 dark:to-background",
      },
      padding: {
        none: "gap-0",
        sm: "gap-4",
        default: "gap-6",
        lg: "gap-8",
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-0.5",
        scale: "hover:scale-[1.02]",
        shadow: "hover:shadow-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      hover: "none",
    },
  },
);

function Card({ 
  className, 
  variant, 
  padding, 
  hover,
  ...props 
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, padding, hover }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [&:has(+[data-slot=card-content])]:pb-0 [&:not(:has(+[data-slot=card-content]))]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center justify-between px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-xl font-bold leading-none",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "flex items-center gap-2",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};