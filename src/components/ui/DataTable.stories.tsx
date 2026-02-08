"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Database } from "lucide-react";
import { DataTable, type Column } from "./DataTable";
import { Badge } from "./Badge";
import { Button } from "./Button";

const meta: Meta = {
  title: "UI/DataTable",
};
export default meta;

type Story = StoryObj;

interface User extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const columns: Column<User>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "role", label: "Role", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <Badge variant={row.status === "active" ? "success" : "default"} dot>
        {row.status}
      </Badge>
    ),
  },
];

const data: User[] = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "active" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "Editor", status: "active" },
  { id: "3", name: "Charlie Brown", email: "charlie@example.com", role: "Viewer", status: "inactive" },
  { id: "4", name: "Diana Prince", email: "diana@example.com", role: "Editor", status: "active" },
  { id: "5", name: "Erik Larsson", email: "erik@example.com", role: "Owner", status: "active" },
];

export const Default: Story = {
  render: () => (
    <DataTable columns={columns} data={data} sortable />
  ),
};

export const Selectable: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={data}
      sortable
      selectable
      onSelectionChange={(selected) => console.log("Selected:", selected)}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <DataTable columns={columns} data={[]} loading />
  ),
};

export const Empty: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={[]}
      emptyState={{
        icon: <Database className="w-12 h-12" />,
        title: "No users found",
        description: "Get started by adding your first team member.",
        action: <Button>Add User</Button>,
      }}
    />
  ),
};
