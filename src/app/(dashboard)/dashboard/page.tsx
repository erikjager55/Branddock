"use client";

import {
  Activity,
  Target,
  FileText,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  FlaskConical,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Brand Health Score",
    value: "78",
    suffix: "/100",
    trend: "+5%",
    trendUp: true,
    icon: Activity,
    iconColor: "text-emerald-400",
    href: "/knowledge",
  },
  {
    label: "Active Campaigns",
    value: "4",
    trend: "+2",
    trendUp: true,
    icon: Target,
    iconColor: "text-blue-400",
    href: "/strategy",
  },
  {
    label: "Content Items",
    value: "23",
    trend: "+7 this week",
    trendUp: true,
    icon: FileText,
    iconColor: "text-purple-400",
    href: "/strategy",
  },
  {
    label: "Research Tasks",
    value: "6",
    trend: "-1",
    trendUp: false,
    icon: ClipboardList,
    iconColor: "text-amber-400",
    href: "/validation",
  },
];

const recentActivity = [
  {
    id: "1",
    action: "Campaign created",
    detail: "Brand Awareness Q1",
    time: "10 min ago",
    icon: <Target className="w-4 h-4 text-blue-400" />,
  },
  {
    id: "2",
    action: "Content published",
    detail: "Blog: Building Brand Trust",
    time: "1 hour ago",
    icon: <FileText className="w-4 h-4 text-purple-400" />,
  },
  {
    id: "3",
    action: "Research completed",
    detail: "Market Validation Survey",
    time: "3 hours ago",
    icon: <FlaskConical className="w-4 h-4 text-amber-400" />,
  },
  {
    id: "4",
    action: "Persona updated",
    detail: "CMO Persona v2",
    time: "5 hours ago",
    icon: <Pencil className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: "5",
    action: "Brand score updated",
    detail: "Health Score: 78 → 83",
    time: "Yesterday",
    icon: <Activity className="w-4 h-4 text-emerald-400" />,
  },
];

export default function DashboardPage() {
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-content mx-auto space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-dark">
          {greeting}
        </h2>
        <p className="text-text-dark/50 mt-1">{dateStr}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} hoverable clickable onClick={() => {}}>
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "p-2 rounded-lg bg-background-dark",
                    stat.iconColor
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <Badge
                  variant={stat.trendUp ? "success" : "error"}
                  size="sm"
                >
                  {stat.trendUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.trend}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-text-dark">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-text-dark/40">
                      {stat.suffix}
                    </span>
                  )}
                </p>
                <p className="text-sm text-text-dark/50 mt-0.5">
                  {stat.label}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-4 py-3 border-b border-border-dark flex items-center justify-between">
              <h3 className="font-semibold text-text-dark">Recent Activity</h3>
              <Clock className="w-4 h-4 text-text-dark/30" />
            </div>
            <div className="divide-y divide-border-dark/50">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-background-dark/30 transition-colors"
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-dark">{item.action}</p>
                    <p className="text-xs text-text-dark/50 truncate">
                      {item.detail}
                    </p>
                  </div>
                  <span className="text-xs text-text-dark/30 flex-shrink-0">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card padding="none">
            <div className="px-4 py-3 border-b border-border-dark">
              <h3 className="font-semibold text-text-dark">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-3">
              <Button
                fullWidth
                leftIcon={<Plus className="w-4 h-4" />}
                variant="primary"
              >
                New Campaign
              </Button>
              <Button
                fullWidth
                leftIcon={<Pencil className="w-4 h-4" />}
                variant="secondary"
              >
                Create Content
              </Button>
              <Button
                fullWidth
                leftIcon={<FlaskConical className="w-4 h-4" />}
                variant="secondary"
              >
                Start Research
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
