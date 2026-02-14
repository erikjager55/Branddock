import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TeamMember, Comment, Activity, Notification, ShareSettings, InviteRequest } from '../types/collaboration';

interface CollaborationContextType {
  // Team
  teamMembers: TeamMember[];
  currentUser: TeamMember | null;
  inviteTeamMember: (invite: InviteRequest) => Promise<void>;
  updateMemberRole: (userId: string, role: TeamMember['role']) => void;
  removeMember: (userId: string) => void;
  
  // Comments
  comments: Record<string, Comment[]>; // keyed by resourceId
  addComment: (resourceId: string, content: string) => void;
  updateComment: (commentId: string, content: string) => void;
  deleteComment: (commentId: string) => void;
  addReaction: (commentId: string, emoji: string) => void;
  
  // Activity
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  
  // Sharing
  shareSettings: Record<string, ShareSettings>; // keyed by resourceId
  createShare: (settings: Omit<ShareSettings, 'id' | 'createdAt'>) => string;
  updateShare: (shareId: string, settings: Partial<ShareSettings>) => void;
  revokeShare: (shareId: string) => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const [currentUser] = useState<TeamMember>({
    id: 'user-1',
    name: 'Sarah Mitchell',
    email: 'sarah@company.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    role: 'owner',
    joinedAt: '2024-01-15',
    lastActive: new Date().toISOString(),
    status: 'active'
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    currentUser,
    {
      id: 'user-2',
      name: 'Marcus Chen',
      email: 'marcus@company.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      role: 'admin',
      joinedAt: '2024-01-20',
      lastActive: '2024-12-26T10:30:00Z',
      status: 'active'
    },
    {
      id: 'user-3',
      name: 'Emma Rodriguez',
      email: 'emma@company.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      role: 'editor',
      joinedAt: '2024-02-01',
      lastActive: '2024-12-27T08:15:00Z',
      status: 'active'
    },
    {
      id: 'user-4',
      name: 'James Wilson',
      email: 'james@company.com',
      role: 'viewer',
      joinedAt: '2024-02-10',
      lastActive: '2024-12-25T16:45:00Z',
      status: 'active'
    }
  ]);

  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: 'activity-1',
      type: 'create',
      userId: 'user-1',
      userName: 'Sarah Mitchell',
      userAvatar: currentUser.avatar,
      targetType: 'strategy',
      targetId: 'strategy-1',
      targetName: 'Q1 Product Launch Campaign',
      description: 'Created new campaign strategy',
      timestamp: '2024-12-27T09:30:00Z'
    },
    {
      id: 'activity-2',
      type: 'comment',
      userId: 'user-2',
      userName: 'Marcus Chen',
      targetType: 'strategy',
      targetId: 'strategy-1',
      targetName: 'Q1 Product Launch Campaign',
      description: 'Added a comment',
      timestamp: '2024-12-27T10:15:00Z'
    }
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'notif-1',
      type: 'mention',
      userId: currentUser.id,
      fromUser: {
        id: 'user-2',
        name: 'Marcus Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
      },
      title: 'You were mentioned',
      message: 'Marcus mentioned you in a comment on Q1 Product Launch Campaign',
      link: '/strategy/campaign-strategy-generator',
      read: false,
      createdAt: '2024-12-27T10:15:00Z'
    },
    {
      id: 'notif-2',
      type: 'comment',
      userId: currentUser.id,
      fromUser: {
        id: 'user-3',
        name: 'Emma Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
      },
      title: 'New comment',
      message: 'Emma commented on Brand Performance Dashboard',
      link: '/brand-dashboard',
      read: false,
      createdAt: '2024-12-27T08:45:00Z'
    }
  ]);

  const [shareSettings, setShareSettings] = useState<Record<string, ShareSettings>>({});

  const unreadCount = notifications.filter(n => !n.read).length;

  const inviteTeamMember = useCallback(async (invite: InviteRequest) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newMember: TeamMember = {
      id: `user-${Date.now()}`,
      name: invite.email.split('@')[0],
      email: invite.email,
      role: invite.role,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'invited'
    };
    
    setTeamMembers(prev => [...prev, newMember]);
    
    addActivity({
      type: 'invite',
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      targetType: 'team',
      targetId: newMember.id,
      targetName: newMember.name,
      description: `Invited ${invite.email} as ${invite.role}`
    });
  }, [currentUser]);

  const updateMemberRole = useCallback((userId: string, role: TeamMember['role']) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === userId ? { ...member, role } : member
      )
    );
  }, []);

  const removeMember = useCallback((userId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== userId));
  }, []);

  const addComment = useCallback((resourceId: string, content: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content,
      createdAt: new Date().toISOString(),
      replies: [],
      reactions: []
    };
    
    setComments(prev => ({
      ...prev,
      [resourceId]: [...(prev[resourceId] || []), newComment]
    }));

    addActivity({
      type: 'comment',
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      targetType: 'strategy',
      targetId: resourceId,
      targetName: 'Strategy',
      description: 'Added a comment'
    });
  }, [currentUser]);

  const updateComment = useCallback((commentId: string, content: string) => {
    setComments(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(resourceId => {
        updated[resourceId] = updated[resourceId].map(comment =>
          comment.id === commentId
            ? { ...comment, content, updatedAt: new Date().toISOString() }
            : comment
        );
      });
      return updated;
    });
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    setComments(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(resourceId => {
        updated[resourceId] = updated[resourceId].filter(comment => comment.id !== commentId);
      });
      return updated;
    });
  }, []);

  const addReaction = useCallback((commentId: string, emoji: string) => {
    setComments(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(resourceId => {
        updated[resourceId] = updated[resourceId].map(comment => {
          if (comment.id === commentId) {
            const reactions = comment.reactions || [];
            const existingReaction = reactions.find(r => 
              r.userId === currentUser.id && r.emoji === emoji
            );
            
            if (existingReaction) {
              // Remove reaction
              return {
                ...comment,
                reactions: reactions.filter(r => 
                  !(r.userId === currentUser.id && r.emoji === emoji)
                )
              };
            } else {
              // Add reaction
              return {
                ...comment,
                reactions: [
                  ...reactions,
                  { emoji, userId: currentUser.id, userName: currentUser.name }
                ]
              };
            }
          }
          return comment;
        });
      });
      return updated;
    });
  }, [currentUser]);

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const createShare = useCallback((settings: Omit<ShareSettings, 'id' | 'createdAt'>) => {
    const shareId = `share-${Date.now()}`;
    const newShare: ShareSettings = {
      ...settings,
      id: shareId,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id
    };
    
    setShareSettings(prev => ({
      ...prev,
      [settings.resourceId]: newShare
    }));

    addActivity({
      type: 'share',
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      targetType: settings.resourceType,
      targetId: settings.resourceId,
      targetName: 'Resource',
      description: `Shared via ${settings.shareType}`
    });

    return shareId;
  }, [currentUser, addActivity]);

  const updateShare = useCallback((shareId: string, updates: Partial<ShareSettings>) => {
    setShareSettings(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key].id === shareId) {
          updated[key] = { ...updated[key], ...updates };
        }
      });
      return updated;
    });
  }, []);

  const revokeShare = useCallback((shareId: string) => {
    setShareSettings(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key].id === shareId) {
          delete updated[key];
        }
      });
      return updated;
    });
  }, []);

  return (
    <CollaborationContext.Provider
      value={{
        teamMembers,
        currentUser,
        inviteTeamMember,
        updateMemberRole,
        removeMember,
        comments,
        addComment,
        updateComment,
        deleteComment,
        addReaction,
        activities,
        addActivity,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        shareSettings,
        createShare,
        updateShare,
        revokeShare
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}