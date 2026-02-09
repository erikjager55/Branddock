"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  Calendar,
  Users,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

// ── Data ──

const KEY_FINDINGS = [
  { num: 1, title: "Core Purpose", text: "Brand exists to democratize brand management through AI-powered tools accessible to teams of all sizes." },
  { num: 2, title: "Unique Value", text: "The integrated strategy-to-content pipeline is a clear differentiator with no direct competition." },
  { num: 3, title: "Customer Need", text: "Brand drift is the #1 challenge for growing marketing teams, creating strong product-market fit." },
  { num: 4, title: "Market Position", text: "Positioned uniquely between brand consultancy and content tooling — a defensible niche." },
  { num: 5, title: "Growth Lever", text: "Thought leadership and case studies are the most effective channels for target audience." },
];

const RECOMMENDATIONS = [
  "Formalize the brand voice guidelines based on workshop findings",
  "Create a brand consistency scorecard for all content",
  "Develop an internal brand training program",
  "Launch a customer-facing brand health assessment tool",
];

const PARTICIPANTS = [
  { name: "Erik Jager", role: "Brand Manager" },
  { name: "Sarah Mitchell", role: "Content Lead" },
  { name: "David Chen", role: "Marketing Director" },
  { name: "Lisa Park", role: "Design Lead" },
  { name: "Tom Wilson", role: "Product Manager" },
  { name: "Ana Rivera", role: "UX Researcher" },
  { name: "James Brown", role: "Sales Lead" },
  { name: "Maya Singh", role: "CEO" },
];

const OBJECTIVES = [
  "Define core brand purpose and values",
  "Map the customer journey touchpoints",
  "Identify brand differentiation factors",
  "Create actionable brand guidelines",
];

const AGENDA = [
  { time: "09:00", item: "Welcome & Introductions" },
  { time: "09:15", item: "Core Purpose Exercise" },
  { time: "09:45", item: "Break" },
  { time: "10:00", item: "Unique Value Mapping" },
  { time: "10:30", item: "Customer Journey Workshop" },
  { time: "11:00", item: "Break" },
  { time: "11:15", item: "Insight Synthesis" },
  { time: "11:45", item: "Action Planning" },
  { time: "12:15", item: "Closing & Next Steps" },
  { time: "12:30", item: "Workshop End" },
];

const NOTES = [
  { name: "Sarah Mitchell", time: "10:23 AM", text: "Key insight: our customers don't just want tools, they want strategic guidance that scales." },
  { name: "David Chen", time: "10:45 AM", text: "We should emphasize the AI-powered aspect more — it's what sets us apart from traditional brand platforms." },
  { name: "Lisa Park", time: "11:12 AM", text: "Visual consistency is as important as voice consistency. Need to address both in guidelines." },
  { name: "Maya Singh", time: "11:35 AM", text: "The brand drift concept resonated with everyone. Consider making it central to our messaging." },
];

const GALLERY = [
  { caption: "Team brainstorming session" },
  { caption: "Golden Circle whiteboard" },
  { caption: "Customer journey mapping" },
  { caption: "Action planning board" },
];

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Canvas", value: "canvas" },
  { label: "Workshop", value: "workshop" },
  { label: "Notes", value: "notes" },
  { label: "Gallery", value: "gallery" },
];

// ── Component ──

export default function WorkshopCompletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">Canvas Workshop</h1>
            <Badge variant="success" size="sm" dot className="mt-1">Completed</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-text-dark/40">1 of 1</span>
          <button className="p-2 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Completion Banner */}
      <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-emerald-300">Workshop Complete</h2>
        </div>
        <p className="text-sm text-emerald-300/60 mb-4">8 participants completed all 6 steps in 1.5 hours</p>
        <div className="flex flex-wrap items-center gap-5 text-sm text-text-dark/50 mb-4">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Feb 5, 2026</span>
          <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> 8 participants</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 1.5 hours</span>
          <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> External facilitator</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export PDF
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
            Raw Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="underline" className="mb-6" />

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-text-dark">Executive Summary</h3>
            </div>
            <p className="text-sm text-text-dark/70 leading-relaxed">
              The Canvas Workshop successfully aligned 8 team members on Branddock&apos;s core brand elements. Through structured exercises, the team identified the brand&apos;s fundamental purpose, unique value proposition, and strategic positioning. Key themes of AI democratization and brand consistency emerged as central pillars. The workshop produced actionable guidelines for maintaining brand integrity across all channels.
            </p>
          </Card>
          <Card padding="lg">
            <h3 className="text-base font-semibold text-text-dark mb-4">Key Findings</h3>
            <div className="space-y-3">
              {KEY_FINDINGS.map((f) => (
                <div key={f.num} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{f.num}</span>
                  <div><p className="text-sm font-medium text-text-dark">{f.title}</p><p className="text-sm text-text-dark/60">{f.text}</p></div>
                </div>
              ))}
            </div>
          </Card>
          <Card padding="lg">
            <h3 className="text-base font-semibold text-text-dark mb-4">Strategic Recommendations</h3>
            <div className="space-y-2">
              {RECOMMENDATIONS.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  <p className="text-sm text-text-dark/70">{r}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "canvas" && (
        <div className="space-y-6">
          <p className="text-sm text-text-dark/50 mb-2">Golden Circle Framework</p>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="info" size="sm">WHY</Badge>
            <span className="text-text-dark/20">&rarr;</span>
            <Badge variant="success" size="sm">HOW</Badge>
            <span className="text-text-dark/20">&rarr;</span>
            <Badge variant="warning" size="sm">WHAT</Badge>
          </div>
          {[
            { label: "WHY — Purpose", color: "blue", quote: "To democratize brand management so every company can build a brand that truly resonates.", tip: "Purpose should answer: Why does your brand exist beyond making money?" },
            { label: "HOW — Process", color: "emerald", quote: "Through an AI-powered platform that integrates knowledge, strategy, and content creation in one seamless workflow.", tip: "Process describes your unique approach to fulfilling your purpose." },
            { label: "WHAT — Product", color: "amber", quote: "An intelligent brand management platform with AI-driven analysis, campaign creation, and content generation.", tip: "Product is the tangible output — what customers actually buy." },
          ].map((item) => (
            <Card key={item.label} padding="lg">
              <Badge variant={item.color === "blue" ? "info" : item.color === "emerald" ? "success" : "warning"} size="sm" className="mb-3">{item.label}</Badge>
              <blockquote className="text-sm text-text-dark/80 italic border-l-2 border-primary pl-3 mb-3">&ldquo;{item.quote}&rdquo;</blockquote>
              <p className="text-xs text-text-dark/40">{item.tip}</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "workshop" && (
        <div className="space-y-6">
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">Objectives</h3>
            <div className="space-y-2">
              {OBJECTIVES.map((o) => (
                <div key={o} className="flex items-center gap-2 text-sm text-text-dark/70">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {o}
                </div>
              ))}
            </div>
          </Card>
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">Participants ({PARTICIPANTS.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PARTICIPANTS.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div><p className="text-xs font-medium text-text-dark">{p.name}</p><p className="text-[10px] text-text-dark/40">{p.role}</p></div>
                </div>
              ))}
            </div>
          </Card>
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">Agenda</h3>
            <div className="space-y-0">
              {AGENDA.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border-dark last:border-0">
                  <span className="text-xs font-mono text-text-dark/40 w-12">{a.time}</span>
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm text-text-dark/70">{a.item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="space-y-3">
          {NOTES.map((n, i) => (
            <Card key={i} padding="md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                  {n.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <span className="text-sm font-medium text-text-dark">{n.name}</span>
                <span className="text-xs text-text-dark/30">{n.time}</span>
              </div>
              <p className="text-sm text-text-dark/70 ml-9">{n.text}</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "gallery" && (
        <div className="grid grid-cols-2 gap-4">
          {GALLERY.map((g, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-video rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-text-dark/20" />
              </div>
              <p className="text-xs text-text-dark/40 text-center">{g.caption}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border-dark">
        <Link
          href={`/knowledge/brand-foundation/${id}`}
          className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Asset
        </Link>
        <Button variant="primary" leftIcon={<Check className="w-4 h-4" />}>Done</Button>
      </div>
    </div>
  );
}
