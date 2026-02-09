"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";

const roleOptions = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

const roleVariants: Record<string, "info" | "success" | "warning" | "default"> = {
  owner: "info",
  admin: "success",
  editor: "warning",
  viewer: "default",
};

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedDate: string;
  status: "online" | "offline";
}

const members: Member[] = [
  {
    id: "1",
    name: "Erik Jager",
    email: "erik@branddock.com",
    role: "owner",
    joinedDate: "Jan 1, 2025",
    status: "online",
  },
  {
    id: "2",
    name: "Sarah Mitchell",
    email: "sarah@branddock.com",
    role: "admin",
    joinedDate: "Jan 5, 2025",
    status: "online",
  },
  {
    id: "3",
    name: "James Wilson",
    email: "james@branddock.com",
    role: "editor",
    joinedDate: "Jan 15, 2025",
    status: "offline",
  },
  {
    id: "4",
    name: "Lisa Chen",
    email: "lisa@branddock.com",
    role: "viewer",
    joinedDate: "Feb 1, 2025",
    status: "offline",
  },
];

const pendingInvitations = [
  {
    id: "inv-1",
    email: "mark@example.com",
    role: "editor",
    sentDate: "Feb 7, 2025",
  },
  {
    id: "inv-2",
    email: "anna@example.com",
    role: "viewer",
    sentDate: "Feb 8, 2025",
  },
];

export default function MembersSettingsPage() {
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, m.role]))
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Members</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Invite Member
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Manage team members and their permissions
        </p>
      </div>

      {/* Members Table */}
      <Card padding="none" className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-dark">
                <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Member
                </th>
                <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Joined
                </th>
                <th className="text-right text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => (
                <tr
                  key={member.id}
                  className={
                    i < members.length - 1
                      ? "border-b border-border-dark/50"
                      : ""
                  }
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.name}
                        size="sm"
                        status={member.status}
                      />
                      <div>
                        <p className="text-sm font-medium text-text-dark">
                          {member.name}
                        </p>
                        <p className="text-xs text-text-dark/40">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {member.role === "owner" ? (
                      <Badge variant={roleVariants[member.role]} size="sm">
                        Owner
                      </Badge>
                    ) : (
                      <Select
                        options={roleOptions.filter((r) => r.value !== "owner")}
                        value={memberRoles[member.id]}
                        onChange={(val) =>
                          setMemberRoles({ ...memberRoles, [member.id]: val })
                        }
                        className="w-32"
                      />
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-text-dark/40">
                    {member.joinedDate}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {member.role !== "owner" && (
                      <button className="p-1.5 rounded-lg text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending Invitations */}
      <h2 className="text-lg font-semibold text-text-dark mb-4">
        Pending Invitations
      </h2>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-dark">
                <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Sent
                </th>
                <th className="text-right text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingInvitations.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={
                    i < pendingInvitations.length - 1
                      ? "border-b border-border-dark/50"
                      : ""
                  }
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-text-dark/40" />
                      <span className="text-sm text-text-dark">{inv.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={roleVariants[inv.role]} size="sm">
                      {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-text-dark/40 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {inv.sentDate}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm">
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
