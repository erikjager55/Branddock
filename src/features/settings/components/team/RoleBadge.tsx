'use client';

// ─── Role badge with color-coded role display ───────────────

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
};

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const colorCls = ROLE_COLORS[role.toLowerCase()] ?? ROLE_COLORS.viewer;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorCls}`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
    </span>
  );
}
