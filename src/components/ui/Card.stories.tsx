import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Button } from "./Button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card>
      <p className="text-text-dark">Basic card content</p>
    </Card>
  ),
};

export const WithSections: Story = {
  render: () => (
    <Card className="max-w-sm">
      <Card.Header>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-dark">Card Title</h3>
          <Badge variant="success">Active</Badge>
        </div>
      </Card.Header>
      <Card.Body>
        <p className="text-sm text-text-dark/70">
          This card has a header, body, and footer section.
        </p>
      </Card.Body>
      <Card.Footer>
        <Button size="sm" variant="ghost">Cancel</Button>
        <Button size="sm">Save</Button>
      </Card.Footer>
    </Card>
  ),
};

export const Hoverable: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 max-w-2xl">
      {["Project A", "Project B", "Project C"].map((name) => (
        <Card key={name} hoverable>
          <h3 className="font-semibold text-text-dark">{name}</h3>
          <p className="text-sm text-text-dark/60 mt-1">Hover to highlight</p>
        </Card>
      ))}
    </div>
  ),
};

export const Selected: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card selected><p className="text-text-dark">Selected</p></Card>
      <Card><p className="text-text-dark">Not selected</p></Card>
    </div>
  ),
};

export const Paddings: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card padding="none"><p className="text-text-dark">None</p></Card>
      <Card padding="sm"><p className="text-text-dark">Small</p></Card>
      <Card padding="md"><p className="text-text-dark">Medium</p></Card>
      <Card padding="lg"><p className="text-text-dark">Large</p></Card>
    </div>
  ),
};
