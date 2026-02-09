"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Edit, Check } from "lucide-react";

const colors = [
  { name: "Minty Green", hex: "#1FD1B2", usage: "Primary" },
  { name: "Dark Slate", hex: "#1F2937", usage: "Text" },
  { name: "Electric Blue", hex: "#5252E3", usage: "Secondary" },
  { name: "Peach Pink", hex: "#FECFBD", usage: "Accent" },
  { name: "Orange Red", hex: "#FF6B48", usage: "Destructive" },
  { name: "Lime Sunset", hex: "#F9FD48", usage: "Highlight" },
];

const fonts = [
  {
    family: "Inter",
    usage: "Primary — Headings & Body",
    weights: [400, 500, 600, 700],
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    family: "JetBrains Mono",
    usage: "Code & Technical",
    weights: [400, 500, 700],
    sample: "const brand = { name: 'Branddock' };",
  },
];

const guidelines = [
  {
    title: "Logo Usage",
    rules: [
      "Minimum clear space equal to the height of the 'B' in Branddock",
      "Never stretch, rotate, or alter the logo proportions",
      "Use the primary green logo on light backgrounds",
      "Use the white logo on dark or colored backgrounds",
    ],
  },
  {
    title: "Visual Guidelines",
    rules: [
      "Border radius: 12px (xl) for cards, 8px (lg) for buttons",
      "Shadows: use shadow-sm for cards, shadow-md on hover",
      "Spacing follows a 4px grid system",
      "Icons: Lucide React, 16px (w-4) default, 20px (w-5) for emphasis",
    ],
  },
];

export default function BrandstylePage() {
  return (
    <div className="max-w-[1400px] space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Brandstyle</h1>
          <Button
            variant="outline"
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Edit Style
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Visual identity system — colors, typography, logo usage, and guidelines
        </p>
      </div>

      {/* Colors */}
      <section>
        <h2 className="text-lg font-semibold text-text-dark mb-4">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {colors.map((color) => (
            <Card key={color.hex} padding="none" className="overflow-hidden">
              <div
                className="h-20"
                style={{ backgroundColor: color.hex }}
              />
              <div className="p-3">
                <p className="text-xs font-semibold text-text-dark">
                  {color.name}
                </p>
                <p className="text-xs text-text-dark/40 font-mono">
                  {color.hex}
                </p>
                <p className="text-xs text-text-dark/40 mt-1">{color.usage}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className="text-lg font-semibold text-text-dark mb-4">
          Typography
        </h2>
        <div className="space-y-4">
          {fonts.map((font) => (
            <Card key={font.family} padding="lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-dark">
                    {font.family}
                  </h3>
                  <p className="text-xs text-text-dark/40">{font.usage}</p>
                </div>
                <div className="flex gap-2">
                  {font.weights.map((w) => (
                    <span
                      key={w}
                      className="text-xs text-text-dark/40 bg-surface-dark px-2 py-0.5 rounded"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
              <p
                className="text-2xl text-text-dark"
                style={{ fontFamily: font.family }}
              >
                {font.sample}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Guidelines */}
      {guidelines.map((section) => (
        <section key={section.title}>
          <h2 className="text-lg font-semibold text-text-dark mb-4">
            {section.title}
          </h2>
          <Card padding="lg">
            <ul className="space-y-3">
              {section.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark/80">{rule}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
