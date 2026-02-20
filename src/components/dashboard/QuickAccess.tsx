import React from 'react';
import { Layers, Users, FlaskConical, ChevronRight } from 'lucide-react';
import { useDashboardStats } from '../../hooks/use-dashboard';

interface QuickAccessProps {
  onNavigate: (section: string) => void;
}

export function QuickAccess({ onNavigate }: QuickAccessProps) {
  const { data } = useDashboardStats();

  const totalAssets = data
    ? data.readyToUse + data.needAttention + data.inProgress
    : 0;

  const items = [
    {
      icon: Layers,
      label: 'Brand Assets',
      subtitle: `${totalAssets} assets`,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      section: 'brand',
    },
    {
      icon: Users,
      label: 'Personas',
      subtitle: 'Active personas',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      section: 'personas',
    },
    {
      icon: FlaskConical,
      label: 'Research Hub',
      subtitle: 'Active research',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      section: 'research',
    },
  ];

  return (
    <div data-testid="quick-access">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Access</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              data-testid="quick-access-card"
              onClick={() => onNavigate(item.section)}
              className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bgColor}`}>
                <Icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.subtitle}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
