"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";
import { ToastProvider } from "./Toast";
import { useToast } from "@/hooks/useToast";

const meta: Meta = {
  title: "UI/Toast",
  decorators: [
    (Story) => (
      <>
        <Story />
        <ToastProvider />
      </>
    ),
  ],
};
export default meta;

type Story = StoryObj;

function ToastDemo() {
  const { success, error, warning, info, toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary" onClick={() => success("Success!", "Your changes have been saved.")}>
        Success Toast
      </Button>
      <Button variant="destructive" onClick={() => error("Error", "Something went wrong. Please try again.")}>
        Error Toast
      </Button>
      <Button variant="secondary" onClick={() => warning("Warning", "Your session will expire soon.")}>
        Warning Toast
      </Button>
      <Button variant="outline" onClick={() => info("Info", "A new update is available.")}>
        Info Toast
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({
            variant: "success",
            title: "With Action",
            description: "Click the button below to undo.",
            action: { label: "Undo", onClick: () => {} },
          })
        }
      >
        With Action
      </Button>
    </div>
  );
}

export const AllVariants: Story = {
  render: () => <ToastDemo />,
};
