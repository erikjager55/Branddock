/**
 * MOCK DATA: Sample Activities
 * 
 * Generates sample activities for demonstration.
 */

import { activityService } from '../services/ActivityService';
import { ActivityUser } from '../types/activity';

// Mock users
const mockUsers: ActivityUser[] = [
  { id: 'user-1', name: 'Sarah Johnson', role: 'Brand Manager' },
  { id: 'user-2', name: 'Mike Chen', role: 'UX Researcher' },
  { id: 'user-3', name: 'Emma Davis', role: 'Strategy Lead' },
  { id: 'user-4', name: 'Alex Turner', role: 'Product Designer' }
];

/**
 * Generate sample activities for demo purposes
 */
export function generateMockActivities() {
  const now = Date.now();

  // Only generate if no activities exist
  if (activityService.getActivities().length > 0) {
    return;
  }

  // Today
  activityService.addActivity(
    'asset-approved',
    'brand',
    'Brand Asset Approved',
    mockUsers[0],
    {
      assetId: 'asset-1',
      assetTitle: 'Golden Circle Framework',
      fromStatus: 'ready-to-validate',
      toStatus: 'approved'
    },
    {
      description: 'Golden Circle Framework has been approved and is now ready for use',
      isImportant: true
    }
  );

  // 2 hours ago
  activityService.addActivity(
    'research-started',
    'research',
    'New Research Started',
    mockUsers[1],
    {
      planId: 'plan-1',
      planTitle: 'Q1 2024 Brand Perception Study'
    },
    {
      description: 'Workshop sessions have begun with 12 participants',
    }
  );

  // 4 hours ago
  activityService.addActivity(
    'persona-created',
    'personas',
    'New Persona Created',
    mockUsers[2],
    {
      personaId: 'persona-emma',
      personaName: 'Emma - The Innovator'
    },
    {
      description: 'Created new persona based on recent research findings',
    }
  );

  // Yesterday
  const yesterday = now - (24 * 60 * 60 * 1000);
  
  activityService.addActivity(
    'insight-added',
    'research',
    'Research Insight Added',
    mockUsers[1],
    {
      insightText: 'Users prefer visual content over text-based information',
      planId: 'plan-1'
    },
    {
      description: 'Key finding from user interviews added to research plan',
    }
  );

  activityService.addActivity(
    'status-changed',
    'brand',
    'Asset Status Updated',
    mockUsers[3],
    {
      assetId: 'asset-2',
      assetTitle: 'Brand Voice Guidelines',
      fromStatus: 'in-progress',
      toStatus: 'ready-to-validate'
    },
    {
      description: 'Brand Voice Guidelines is now ready for review',
    }
  );

  // 2 days ago
  const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
  
  activityService.addActivity(
    'plan-created',
    'research',
    'Research Plan Created',
    mockUsers[2],
    {
      planId: 'plan-2',
      planTitle: 'Target Audience Analysis'
    },
    {
      description: 'New research plan with 3 methods scheduled',
    }
  );

  activityService.addActivity(
    'comment-added',
    'collaboration',
    'Comment Added',
    mockUsers[0],
    {
      assetId: 'asset-1',
      commentText: 'Great work on the framework documentation!'
    },
    {
      description: 'Commented on Golden Circle Framework',
    }
  );

  // 3 days ago
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
  
  activityService.addActivity(
    'milestone-reached',
    'system',
    'Milestone Reached',
    mockUsers[1],
    {
      milestoneType: '50-assets-created'
    },
    {
      description: '🎉 Your team has created 50 brand assets!',
      isImportant: true
    }
  );

  activityService.addActivity(
    'file-uploaded',
    'brand',
    'File Uploaded',
    mockUsers[3],
    {
      assetId: 'asset-3',
      fileName: 'logo-variations.sketch',
      assetTitle: 'Logo Variations'
    },
    {
      description: 'Uploaded design file to Logo Variations asset',
    }
  );

  // Last week
  const lastWeek = now - (7 * 24 * 60 * 60 * 1000);
  
  activityService.addActivity(
    'research-completed',
    'research',
    'Research Completed',
    mockUsers[1],
    {
      planId: 'plan-3',
      planTitle: 'User Testing Round 1'
    },
    {
      description: 'All research methods completed successfully',
      isImportant: true
    }
  );

  activityService.addActivity(
    'relationship-created',
    'strategy',
    'Data Relationship Created',
    mockUsers[2],
    {
      fromEntity: 'Golden Circle Framework',
      toEntity: 'Brand Strategy 2024'
    },
    {
      description: 'Connected brand asset to strategy document',
    }
  );

  console.log('✅ Mock activities generated');
  console.log('📊 Total activities:', activityService.getActivities().length);
  console.log('🔔 Unread count:', activityService.getUnreadCount());
}

/**
 * Clear all mock activities
 */
export function clearMockActivities() {
  activityService.clear();
  console.log('🗑️ Mock activities cleared');
}