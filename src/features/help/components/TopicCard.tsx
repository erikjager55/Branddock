import {
  Rocket,
  Layers,
  BookOpen,
  UserCircle,
  CreditCard,
  AlertTriangle,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { HelpCategoryItem } from '@/types/help';

// ─── Icon map ─────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  Layers,
  BookOpen,
  UserCircle,
  CreditCard,
  AlertTriangle,
  HelpCircle,
};

interface TopicCardProps {
  category: HelpCategoryItem;
  onClick?: () => void;
}

export function TopicCard({ category, onClick }: TopicCardProps) {
  const Icon = ICON_MAP[category.icon] ?? HelpCircle;

  return (
    <div
      onClick={onClick}
      className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
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
      {/* Icon in colored circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: category.iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: category.iconColor }} />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900">{category.name}</h3>
        <p className="text-sm text-gray-500">
          {category.articleCount} articles
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </div>
  );
}
