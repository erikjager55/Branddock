"use client";

import { Plus, Users, Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const typeConfig: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  discovery: { label: "Brand Discovery", variant: "info" },
  strategy: { label: "Strategy", variant: "warning" },
  alignment: { label: "Alignment", variant: "success" },
};

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "warning" | "default" }> = {
  upcoming: { label: "Upcoming", variant: "info" },
  "in-progress": { label: "In Progress", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};

const workshops = [
  {
    id: "1",
    title: "Brand Discovery Workshop: Q2 Strategy",
    type: "discovery",
    status: "upcoming",
    date: "Mar 15, 2025",
    time: "10:00 AM - 4:00 PM",
    participants: 12,
    location: "Virtual (Zoom)",
    description:
      "Full-day workshop to explore brand positioning and messaging for the upcoming quarter. Focus on new market segments.",
  },
  {
    id: "2",
    title: "Content Strategy Alignment Session",
    type: "strategy",
    status: "in-progress",
    date: "Feb 8, 2025",
    time: "2:00 PM - 5:00 PM",
    participants: 8,
    location: "Virtual (Zoom)",
    description:
      "Half-day session to align content strategy with updated brand guidelines and campaign objectives.",
  },
  {
    id: "3",
    title: "Cross-Team Brand Alignment Review",
    type: "alignment",
    status: "completed",
    date: "Jan 22, 2025",
    time: "9:00 AM - 12:00 PM",
    participants: 15,
    location: "Conference Room A",
    description:
      "Review session to ensure all departments are aligned on brand voice, visual identity, and key messaging.",
  },
];

export default function WorkshopsPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Workshops</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Schedule Workshop
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Facilitate collaborative brand workshops with your team
        </p>
      </div>

      {/* Workshop Cards */}
      <div className="space-y-3">
        {workshops.map((workshop) => {
          const type = typeConfig[workshop.type];
          const status = statusConfig[workshop.status];
          return (
            <Card key={workshop.id} hoverable padding="lg">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-dark">
                        {workshop.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={type.variant} size="sm">
                          {type.label}
                        </Badge>
                        <Badge variant={status.variant} size="sm" dot>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-text-dark/60 line-clamp-2">
                    {workshop.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-text-dark/40">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {workshop.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {workshop.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {workshop.participants} participants
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {workshop.location}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
