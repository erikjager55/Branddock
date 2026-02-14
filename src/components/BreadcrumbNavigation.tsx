import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem } from '../types/workflow';
import * as LucideIcons from 'lucide-react';

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  onNavigate: (route: string) => void;
  showHome?: boolean;
}

export function BreadcrumbNavigation({ items, onNavigate, showHome = true }: BreadcrumbNavigationProps) {
  const visibleItems = items.slice(-3); // Show max 3 items
  const hasMore = items.length > 3;

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {/* Home */}
      {showHome && (
        <>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          {items.length > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </>
      )}

      {/* Ellipsis if truncated */}
      {hasMore && (
        <>
          <span className="text-muted-foreground">...</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </>
      )}

      {/* Breadcrumb items */}
      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1;
        const Icon = item.icon ? (LucideIcons as any)[item.icon] : null;

        return (
          <React.Fragment key={item.id}>
            {item.route ? (
              <button
                onClick={() => onNavigate(item.route!)}
                className={`flex items-center gap-1.5 transition-colors ${
                  isLast 
                    ? 'text-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-current={isLast ? 'page' : undefined}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="truncate max-w-[200px]">{item.label}</span>
              </button>
            ) : (
              <span
                className={`flex items-center gap-1.5 ${
                  isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
                aria-current={isLast ? 'page' : undefined}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="truncate max-w-[200px]">{item.label}</span>
              </span>
            )}

            {!isLast && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
