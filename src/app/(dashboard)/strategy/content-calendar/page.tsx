"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { ContentType, contentTypeLabels } from "@/types/content";
import { useContent, Content } from "@/hooks/api/useContent";
import { DemoBanner } from "@/components/ui/DemoBanner";

interface CalendarItem {
  id: string;
  title: string;
  type: ContentType;
  date: string;
  campaign: string;
  status: "draft" | "scheduled" | "published";
}

const typeColors: Record<ContentType, string> = {
  [ContentType.BlogPost]: "bg-blue-400",
  [ContentType.SocialMedia]: "bg-violet-400",
  [ContentType.Email]: "bg-amber-400",
  [ContentType.AdCopy]: "bg-rose-400",
  [ContentType.LandingPage]: "bg-emerald-400",
  [ContentType.Video]: "bg-pink-400",
  [ContentType.CaseStudy]: "bg-cyan-400",
  [ContentType.Report]: "bg-orange-400",
  [ContentType.Webinar]: "bg-teal-400",
};

function generatePlaceholderItems(year: number, month: number): CalendarItem[] {
  return [
    { id: "cal-1", title: "Launch Announcement Blog Post", type: ContentType.BlogPost, date: `${year}-${String(month + 1).padStart(2, "0")}-03`, campaign: "Q1 Product Launch", status: "published" },
    { id: "cal-2", title: "Instagram Carousel: New Features", type: ContentType.SocialMedia, date: `${year}-${String(month + 1).padStart(2, "0")}-05`, campaign: "Q1 Product Launch", status: "published" },
    { id: "cal-3", title: "Welcome Email Sequence", type: ContentType.Email, date: `${year}-${String(month + 1).padStart(2, "0")}-07`, campaign: "Brand Awareness", status: "scheduled" },
    { id: "cal-4", title: "Twitter Thread: Industry Trends", type: ContentType.SocialMedia, date: `${year}-${String(month + 1).padStart(2, "0")}-10`, campaign: "Brand Awareness", status: "scheduled" },
    { id: "cal-5", title: "Customer Success Story", type: ContentType.CaseStudy, date: `${year}-${String(month + 1).padStart(2, "0")}-12`, campaign: "Q1 Product Launch", status: "draft" },
    { id: "cal-6", title: "Google Ads: Spring Campaign", type: ContentType.AdCopy, date: `${year}-${String(month + 1).padStart(2, "0")}-15`, campaign: "Brand Awareness", status: "scheduled" },
    { id: "cal-7", title: "Product Deep Dive Blog", type: ContentType.BlogPost, date: `${year}-${String(month + 1).padStart(2, "0")}-18`, campaign: "Q1 Product Launch", status: "draft" },
    { id: "cal-8", title: "LinkedIn Post: Thought Leadership", type: ContentType.SocialMedia, date: `${year}-${String(month + 1).padStart(2, "0")}-20`, campaign: "Brand Awareness", status: "scheduled" },
    { id: "cal-9", title: "Newsletter: Monthly Roundup", type: ContentType.Email, date: `${year}-${String(month + 1).padStart(2, "0")}-25`, campaign: "Brand Awareness", status: "draft" },
    { id: "cal-10", title: "Webinar: Brand Strategy 2025", type: ContentType.Webinar, date: `${year}-${String(month + 1).padStart(2, "0")}-28`, campaign: "Q1 Product Launch", status: "scheduled" },
  ];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusVariants: Record<string, "default" | "info" | "success"> = {
  draft: "default",
  scheduled: "info",
  published: "success",
  DRAFT: "default",
  IN_PROGRESS: "info",
  REVIEW: "info",
  APPROVED: "success",
  PUBLISHED: "success",
};

function mapContentToCalendarItems(content: Content[]): CalendarItem[] {
  return content.map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type as ContentType,
    date: c.createdAt.split("T")[0],
    campaign: "",
    status: c.status === "PUBLISHED" ? "published" : c.status === "DRAFT" ? "draft" : "scheduled",
  }));
}

export default function ContentCalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError } = useContent({ workspaceId, limit: 100 });

  const hasApiData = !isError && apiData?.data && apiData.data.length > 0;
  const items = useMemo(() => {
    if (hasApiData) {
      return mapContentToCalendarItems(apiData!.data);
    }
    return generatePlaceholderItems(currentYear, currentMonth);
  }, [hasApiData, apiData, currentYear, currentMonth]);
  const isDemo = !isLoading && !hasApiData;

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach((item) => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });
    return map;
  }, [items]);

  const selectedItems = selectedDate ? itemsByDate[selectedDate] || [] : [];

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = (firstDay.getDay() + 6) % 7;

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
    setSelectedDate(null);
  };

  const goToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(null);
  };

  const formatDateKey = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Content Calendar</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Create Content
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Plan and schedule your content across campaigns
        </p>
      </div>

      {/* Demo Banner */}
      {isDemo && <DemoBanner />}

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-dark text-text-dark/60 hover:text-text-dark transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-text-dark w-48 text-center">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-dark text-text-dark/60 hover:text-text-dark transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
      </div>

      {isLoading ? (
        <Skeleton variant="rect" height={500} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Grid */}
          <Card padding="none" className="flex-1 overflow-x-auto">
            <div className="grid grid-cols-7 border-b border-border-dark">
              {DAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium text-text-dark/40 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="h-24 border-b border-r border-border-dark/50 bg-background-dark/30" />;
                }
                const dateKey = formatDateKey(day);
                const dayItems = itemsByDate[dateKey] || [];
                const isSelected = selectedDate === dateKey;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                    className={cn(
                      "h-24 border-b border-r border-border-dark/50 p-1.5 text-left transition-colors",
                      isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary" : "hover:bg-surface-dark/50"
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                      isToday(day) ? "bg-primary text-white" : "text-text-dark/60"
                    )}>
                      {day}
                    </span>
                    {dayItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dayItems.slice(0, 3).map((item) => (
                          <span key={item.id} className={cn("w-2 h-2 rounded-full", typeColors[item.type])} title={item.title} />
                        ))}
                        {dayItems.length > 3 && (
                          <span className="text-[10px] text-text-dark/40">+{dayItems.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Day Detail Panel */}
          {selectedDate && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <Card padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-dark">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </h3>
                  <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-surface-dark text-text-dark/40 hover:text-text-dark transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedItems.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-8 h-8 text-text-dark/20 mx-auto mb-2" />
                    <p className="text-xs text-text-dark/40">No content scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="p-3 rounded-lg border border-border-dark space-y-2">
                        <div className="flex items-start gap-2">
                          <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", typeColors[item.type])} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-dark truncate">{item.title}</p>
                            {item.campaign && <p className="text-xs text-text-dark/40">{item.campaign}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" size="sm">{contentTypeLabels[item.type]}</Badge>
                          <Badge variant={statusVariants[item.status] || "default"} size="sm">
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-text-dark/40">
        {Object.entries(contentTypeLabels)
          .filter(([key]) => items.some((item) => item.type === key))
          .map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={cn("w-2.5 h-2.5 rounded-full", typeColors[key as ContentType])} />
              {label}
            </span>
          ))}
      </div>
    </div>
  );
}
