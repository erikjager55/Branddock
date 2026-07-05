import { Rocket, BookOpen, MessageCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QuickActionCard } from './QuickActionCard';

const QUICK_ACTIONS = [
  {
    id: 'gettingStarted',
    icon: Rocket,
    colorClasses: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
  },
  {
    id: 'documentation',
    icon: BookOpen,
    colorClasses: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
  },
  {
    id: 'liveChat',
    icon: MessageCircle,
    colorClasses: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    hasBadge: true,
  },
  {
    id: 'contactSupport',
    icon: Mail,
    colorClasses: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
  },
] as const;

export function QuickActionCards() {
  const { t } = useTranslation('help');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {QUICK_ACTIONS.map((action) => (
        <QuickActionCard
          key={action.id}
          icon={action.icon}
          title={t(`quickActions.${action.id}.title`)}
          description={t(`quickActions.${action.id}.description`)}
          colorClasses={action.colorClasses}
          badge={
            'hasBadge' in action && action.hasBadge
              ? t('quickActions.liveChat.badge')
              : undefined
          }
          onClick={() => console.log(`Clicked: ${action.id}`)}
        />
      ))}
    </div>
  );
}
