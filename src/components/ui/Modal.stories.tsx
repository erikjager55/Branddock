"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

const meta: Meta<typeof Modal> = {
  title: "UI/Modal",
  component: Modal,
};
export default meta;

type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Modal Title"
          description="This is a description of the modal."
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p className="text-text-dark/80">Modal body content goes here.</p>
        </Modal>
      </>
    );
  },
};

export const AllSizes: Story = {
  render: () => {
    const [size, setSize] = useState<"sm" | "md" | "lg" | "xl" | null>(null);
    return (
      <>
        <div className="flex gap-2">
          {(["sm", "md", "lg", "xl"] as const).map((s) => (
            <Button key={s} variant="outline" onClick={() => setSize(s)}>
              {s.toUpperCase()}
            </Button>
          ))}
        </div>
        <Modal
          open={size !== null}
          onClose={() => setSize(null)}
          title={`${size?.toUpperCase()} Modal`}
          size={size || "md"}
        >
          <p className="text-text-dark/80">This is a {size} modal.</p>
        </Modal>
      </>
    );
  },
};
