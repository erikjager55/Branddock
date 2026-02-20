import { ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

export interface PageHeaderProps {
  backLabel?: string;
  onBack?: () => void;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  primaryAction?: PageHeaderAction;
  secondaryAction?: PageHeaderAction;
  actions?: React.ReactNode;
}

export function PageHeader({
  backLabel,
  onBack,
  icon: Icon,
  iconBg = 'bg-teal-100',
  iconColor = 'text-teal-600',
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  actions,
}: PageHeaderProps) {
  return (
    <div data-testid="page-header" className="mb-6">
      {/* Back navigation */}
      {backLabel && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </button>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Icon circle */}
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          {/* Title + subtitle */}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-600 border border-teal-200 rounded-xl text-sm font-medium hover:bg-teal-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4" />}
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium shadow-sm hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
              {primaryAction.label}
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
