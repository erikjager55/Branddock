import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Mail, Eye, Search } from "lucide-react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter text..." },
};

export const WithLabel: Story = {
  args: { label: "Email", placeholder: "you@example.com" },
};

export const WithHelperText: Story = {
  args: {
    label: "Password",
    type: "password",
    helperText: "Must be at least 8 characters",
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    value: "invalid-email",
    error: "Please enter a valid email address",
  },
};

export const WithIcons: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <Input
        label="Email"
        placeholder="you@example.com"
        leftIcon={<Mail className="w-4 h-4" />}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        rightIcon={<Eye className="w-4 h-4" />}
      />
      <Input
        placeholder="Search..."
        leftIcon={<Search className="w-4 h-4" />}
      />
    </div>
  ),
};

export const Disabled: Story = {
  args: { label: "Disabled", value: "Cannot edit", disabled: true },
};
