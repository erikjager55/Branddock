"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Plus,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

// ── Data ──

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Psychographics", value: "psychographics" },
  { label: "Background", value: "background" },
];

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
];

const EDUCATION_OPTIONS = [
  { value: "high-school", label: "High School" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "other", label: "Other" },
];

const INCOME_OPTIONS = [
  { value: "0-30k", label: "$0 - $30,000" },
  { value: "30-60k", label: "$30,000 - $60,000" },
  { value: "60-100k", label: "$60,000 - $100,000" },
  { value: "100-150k", label: "$100,000 - $150,000" },
  { value: "150k+", label: "$150,000+" },
];

// ── Component ──

export default function CreatePersonaPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");

  // Overview demographics
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [income, setIncome] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Psychographics
  const [goals, setGoals] = useState<string[]>([""]);
  const [frustrations, setFrustrations] = useState<string[]>([""]);
  const [motivations, setMotivations] = useState<string[]>([""]);
  const [values, setValues] = useState<string[]>([""]);

  // Background
  const [behaviors, setBehaviors] = useState<string[]>([""]);
  const [interests, setInterests] = useState<string[]>([""]);

  const addItem = (list: string[], setList: (v: string[]) => void) => {
    setList([...list, ""]);
  };

  const updateItem = (list: string[], setList: (v: string[]) => void, index: number, value: string) => {
    const updated = [...list];
    updated[index] = value;
    setList(updated);
  };

  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    if (list.length <= 1) return;
    setList(list.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Back */}
      <Link
        href="/knowledge/personas"
        className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Personas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-purple-400/50" />
          </div>
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Persona name"
              className="text-lg font-semibold"
            />
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Short tagline, e.g. 'The busy marketing director'"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/knowledge/personas">
            <Button variant="ghost" size="sm" leftIcon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
          </Link>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Create Persona
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="underline" className="mb-6" />

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Demographics */}
          <div className="lg:col-span-2 space-y-4">
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-text-dark mb-4">Demographics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Age</label>
                  <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 35-45" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Gender</label>
                  <Select options={GENDER_OPTIONS} value={gender} onChange={setGender} placeholder="Select gender" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Location</label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. San Francisco, CA" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Occupation</label>
                  <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Marketing Director" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Education</label>
                  <Select options={EDUCATION_OPTIONS} value={education} onChange={setEducation} placeholder="Select education" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Income</label>
                  <Select options={INCOME_OPTIONS} value={income} onChange={setIncome} placeholder="Select range" />
                </div>
              </div>
            </Card>
          </div>

          {/* Persona Image Generator */}
          <div>
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-text-dark mb-3">Persona Image</h3>
              <div className="aspect-square rounded-lg bg-background-dark border border-border-dark flex items-center justify-center mb-3">
                <ImageIcon className="w-12 h-12 text-text-dark/15" />
              </div>
              <div className="rounded-md bg-amber-500/5 border border-amber-500/20 px-3 py-2 mb-3">
                <p className="text-xs text-amber-300/70">AI-generated images help visualize your persona but should not replace real user research.</p>
              </div>
              <Button variant="secondary" fullWidth size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                Generate Image
              </Button>
              <div className="mt-3">
                <label className="block text-xs text-text-dark/40 mb-1">Or enter image URL</label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Psychographics */}
      {activeTab === "psychographics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RepeatableCard
            title="Goals"
            icon="target"
            prompt="What does this persona want to achieve?"
            items={goals}
            setItems={setGoals}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            addLabel="Add Goal"
          />
          <RepeatableCard
            title="Frustrations"
            icon="alert"
            prompt="What challenges do they face?"
            items={frustrations}
            setItems={setFrustrations}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            addLabel="Add Frustration"
          />
          <RepeatableCard
            title="Motivations"
            icon="heart"
            prompt="What drives their decisions?"
            items={motivations}
            setItems={setMotivations}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            addLabel="Add Motivation"
          />
          <RepeatableCard
            title="Values"
            icon="sparkles"
            prompt="What principles guide them?"
            items={values}
            setItems={setValues}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            addLabel="Add Value"
          />
        </div>
      )}

      {/* Tab: Background */}
      {activeTab === "background" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RepeatableCard
            title="Behaviors"
            icon="zap"
            prompt="How does this persona behave in relevant contexts?"
            items={behaviors}
            setItems={setBehaviors}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            addLabel="Add Behavior"
          />
          <RepeatableCard
            title="Interests"
            icon="lightbulb"
            prompt="What topics and activities interest them?"
            items={interests}
            setItems={setInterests}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            addLabel="Add Interest"
          />
        </div>
      )}
    </div>
  );
}

// ── Repeatable Card sub-component ──

const ICON_MAP: Record<string, string> = {
  target: "bg-blue-500/10 text-blue-400",
  alert: "bg-amber-500/10 text-amber-400",
  heart: "bg-rose-500/10 text-rose-400",
  sparkles: "bg-purple-500/10 text-purple-400",
  zap: "bg-emerald-500/10 text-emerald-400",
  lightbulb: "bg-cyan-500/10 text-cyan-400",
};

function RepeatableCard({
  title,
  icon,
  prompt,
  items,
  setItems,
  addItem,
  updateItem,
  removeItem,
  addLabel,
}: {
  title: string;
  icon: string;
  prompt: string;
  items: string[];
  setItems: (v: string[]) => void;
  addItem: (list: string[], setList: (v: string[]) => void) => void;
  updateItem: (list: string[], setList: (v: string[]) => void, index: number, value: string) => void;
  removeItem: (list: string[], setList: (v: string[]) => void, index: number) => void;
  addLabel: string;
}) {
  const colors = ICON_MAP[icon] || "bg-primary/10 text-primary";
  return (
    <Card padding="lg">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold", colors)}>
          {title[0]}
        </div>
        <h3 className="text-sm font-semibold text-text-dark">{title}</h3>
      </div>
      <p className="text-xs text-text-dark/40 mb-3">{prompt}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => updateItem(items, setItems, i, e.target.value)}
              placeholder={`Enter ${title.toLowerCase().slice(0, -1)}...`}
            />
            {items.length > 1 && (
              <button
                onClick={() => removeItem(items, setItems, i)}
                className="p-1.5 rounded text-text-dark/30 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => addItem(items, setItems)}
        className="mt-3 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
      >
        <Plus className="w-3 h-3" /> {addLabel}
      </button>
    </Card>
  );
}
