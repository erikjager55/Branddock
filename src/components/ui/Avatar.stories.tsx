import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: {
    src: "https://i.pravatar.cc/150?u=branddock",
    name: "John Doe",
    size: "lg",
  },
};

export const WithInitials: Story = {
  args: { name: "John Doe", size: "lg" },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Avatar name="John Doe" size="sm" />
      <Avatar name="John Doe" size="md" />
      <Avatar name="John Doe" size="lg" />
      <Avatar name="John Doe" size="xl" />
    </div>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar name="Alice" size="lg" status="online" />
      <Avatar name="Bob" size="lg" status="busy" />
      <Avatar name="Charlie" size="lg" status="offline" />
    </div>
  ),
};

export const DeterministicColors: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {["Alice", "Bob", "Charlie", "Diana", "Erik", "Fiona"].map((name) => (
        <Avatar key={name} name={name} size="md" />
      ))}
    </div>
  ),
};
