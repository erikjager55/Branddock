import { Rocket, BookOpen, MessageCircle, Mail } from 'lucide-react';
import { QuickActionCard } from './QuickActionCard';

const QUICK_ACTIONS = [
  {
    icon: Rocket,
    title: 'Getting Started',
    description: 'Learn the basics and set up your workspace',
    colorClasses: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Browse our comprehensive documentation',
    colorClasses: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
  },
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Chat with our support team in real time',
    colorClasses: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    badge: 'Available',
  },
  {
    icon: Mail,
    title: 'Contact Support',
    description: 'Send us a message and we\'ll get back to you',
    colorClasses: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
  },
] as const;

export function QuickActionCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {QUICK_ACTIONS.map((action) => (
        <QuickActionCard
          key={action.title}
          icon={action.icon}
          title={action.title}
          description={action.description}
          colorClasses={action.colorClasses}
          badge={'badge' in action ? action.badge : undefined}
          onClick={() => console.log(`Clicked: ${action.title}`)}
        />
      ))}
    </div>
  );
}
