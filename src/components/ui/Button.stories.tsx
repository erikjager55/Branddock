import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Mail, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: "Button", variant: "primary" },
};

export const Secondary: Story = {
  args: { children: "Button", variant: "secondary" },
};

export const Outline: Story = {
  args: { children: "Button", variant: "outline" },
};

export const Ghost: Story = {
  args: { children: "Button", variant: "ghost" },
};

export const Destructive: Story = {
  args: { children: "Delete", variant: "destructive" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button leftIcon={<Mail className="w-4 h-4" />}>Send Email</Button>
      <Button rightIcon={<ArrowRight className="w-4 h-4" />}>Next</Button>
      <Button variant="destructive" leftIcon={<Trash2 className="w-4 h-4" />}>Delete</Button>
    </div>
  ),
};

export const Loading: Story = {
  args: { children: "Saving...", loading: true },
};

export const Disabled: Story = {
  args: { children: "Disabled", disabled: true },
};

export const FullWidth: Story = {
  args: { children: "Full Width Button", fullWidth: true },
};
