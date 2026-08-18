import { StatCard } from 'branddock-app';
import { Users, FileText, Coins } from 'lucide-react';

export const Standaard = () => (
  <div className="max-w-xs">
    <StatCard icon={Users} label="Persona's" value="5" />
  </div>
);

export const MetTrend = () => (
  <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
    <StatCard icon={FileText} label="Gepubliceerd deze maand" value="27" trend={{ value: 18, isPositive: true }} />
    <StatCard icon={Coins} label="Credits verbruikt" value="12.480" trend={{ value: 6, isPositive: false }} />
  </div>
);
