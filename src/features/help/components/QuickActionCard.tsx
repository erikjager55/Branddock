import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/shared';

interface QuickActionCardColorClasses {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
}

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  colorClasses: QuickActionCardColorClasses;
  badge?: string;
  onClick?: () => void;
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  colorClasses,
  badge,
  onClick,
}: QuickActionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer ${colorClasses.bg} ${colorClasses.border}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses.iconBg}`}>
          <Icon className={`w-5 h-5 ${colorClasses.text}`} />
        </div>
        {badge && (
          <Badge variant="success" size="sm">
            {badge}
          </Badge>
        )}
      </div>
      <h3 className={`font-semibold text-gray-900 mb-1`}>{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
