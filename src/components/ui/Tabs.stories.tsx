"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
};
export default meta;

type Story = StoryObj<typeof Tabs>;

const tabs = [
  { label: "Overview", value: "overview" },
  { label: "Analytics", value: "analytics" },
  { label: "Settings", value: "settings" },
  { label: "Members", value: "members" },
];

export const Underline: Story = {
  render: () => {
    const [active, setActive] = useState("overview");
    return <Tabs tabs={tabs} activeTab={active} onChange={setActive} variant="underline" />;
  },
};

export const Pills: Story = {
  render: () => {
    const [active, setActive] = useState("overview");
    return <Tabs tabs={tabs} activeTab={active} onChange={setActive} variant="pills" />;
  },
};

export const Enclosed: Story = {
  render: () => {
    const [active, setActive] = useState("overview");
    return <Tabs tabs={tabs} activeTab={active} onChange={setActive} variant="enclosed" />;
  },
};

export const AllVariants: Story = {
  render: () => {
    const [a1, setA1] = useState("overview");
    const [a2, setA2] = useState("overview");
    const [a3, setA3] = useState("overview");
    return (
      <div className="space-y-8">
        <div>
          <p className="text-sm text-text-dark/50 mb-2">Underline</p>
          <Tabs tabs={tabs} activeTab={a1} onChange={setA1} variant="underline" />
        </div>
        <div>
          <p className="text-sm text-text-dark/50 mb-2">Pills</p>
          <Tabs tabs={tabs} activeTab={a2} onChange={setA2} variant="pills" />
        </div>
        <div>
          <p className="text-sm text-text-dark/50 mb-2">Enclosed</p>
          <Tabs tabs={tabs} activeTab={a3} onChange={setA3} variant="enclosed" />
        </div>
      </div>
    );
  },
};
