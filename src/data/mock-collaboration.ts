export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar: string;
  status?: 'active' | 'pending' | 'inactive';
  joinedAt: string;
}

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'owner',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    status: 'active',
    joinedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'member-2',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    status: 'active',
    joinedAt: '2024-02-01T14:30:00Z',
  },
  {
    id: 'member-3',
    name: 'Emma Davis',
    email: 'emma.davis@company.com',
    role: 'editor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    status: 'active',
    joinedAt: '2024-03-10T09:15:00Z',
  },
  {
    id: 'member-4',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    role: 'viewer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    status: 'active',
    joinedAt: '2024-04-05T11:45:00Z',
  },
];

export interface Comment {
  id: string;
  author: TeamMember;
  content: string;
  timestamp: string;
  isResolved?: boolean;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  type: 'comment' | 'mention' | 'update' | 'invite';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actor?: {
    name: string;
    avatar: string;
  };
}

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'mention',
    title: 'New mention',
    message: 'Michael Chen mentioned you in Campaign Strategy Generator',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    read: false,
    actor: {
      name: 'Michael Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    },
  },
  {
    id: 'notif-2',
    type: 'comment',
    title: 'New comment',
    message: 'Emma Davis commented on Brand Vision',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    actor: {
      name: 'Emma Davis',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    },
  },
  {
    id: 'notif-3',
    type: 'update',
    title: 'Strategy updated',
    message: 'Brand Positioning Strategy has been updated',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    actor: {
      name: 'Sarah Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
  },
  {
    id: 'notif-4',
    type: 'invite',
    title: 'Team invitation',
    message: 'You were added to the Marketing Team workspace',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    read: true,
    actor: {
      name: 'Sarah Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
  },
];
