// Collaboration & Team Management Types

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'invited' | 'inactive';
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Activity {
  id: string;
  type: 'comment' | 'edit' | 'share' | 'invite' | 'export' | 'create' | 'delete';
  userId: string;
  userName: string;
  userAvatar?: string;
  targetType: 'strategy' | 'research' | 'persona' | 'campaign' | 'team';
  targetId: string;
  targetName: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: 'mention' | 'comment' | 'invite' | 'share' | 'assignment';
  userId: string;
  fromUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ShareSettings {
  id: string;
  resourceType: 'strategy' | 'research' | 'campaign';
  resourceId: string;
  shareType: 'link' | 'email' | 'team';
  permissions: 'view' | 'comment' | 'edit';
  expiresAt?: string;
  password?: string;
  allowDownload: boolean;
  sharedWith?: string[]; // email addresses or user IDs
  createdAt: string;
  createdBy: string;
}

export interface InviteRequest {
  email: string;
  role: UserRole;
  message?: string;
  expiresAt?: string;
}