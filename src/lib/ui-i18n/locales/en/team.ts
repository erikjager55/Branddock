// Canonical (source-of-truth) English UI strings — `team` namespace.
const ns = {
  page: {
    title: 'Team',
    subtitle: 'Manage team members and permissions',
    back: 'Settings',
    invite: '+ Invite Member',
  },
  loading: 'Loading team...',
  retry: 'Retry',
  errors: {
    load: 'Could not load team members',
    invite: 'Failed to send invitation',
  },
  confirmRemove: 'Are you sure you want to remove this team member?',
  stats: {
    owners: 'Owners',
    admins: 'Admins',
    members: 'Members',
    viewers: 'Viewers',
  },
  search: {
    placeholder: 'Search team members...',
  },
  inviteForm: {
    title: 'Invite Team Member',
    subtitle: 'Send an invitation to join your organization',
    emailLabel: 'Email Address',
    emailPlaceholder: 'colleague@example.com',
    roleLabel: 'Role',
    roleViewer: 'Viewer',
    roleMember: 'Member',
    roleAdmin: 'Admin',
    send: 'Send Invitation',
    cancel: 'Cancel',
  },
  invitations: {
    heading: 'Pending Invitations ({{count}})',
    invitedAs: 'Invited as {{role}} · Expires {{date}}',
    pending: 'Pending',
    cancelTitle: 'Cancel invitation',
  },
  membersList: {
    heading: 'Team Members ({{count}})',
    active: 'Active',
    inactive: 'Inactive',
    joined: 'Joined {{date}}',
    emptyTitle: 'No team members found',
    emptySearch: 'Try adjusting your search query',
    emptyDefault: 'Invite team members to get started',
  },
  permissions: {
    heading: 'Role Permissions',
    owner: {
      title: 'Owner',
      description: 'Full access to all features, billing, and team management',
    },
    admin: {
      title: 'Admin',
      description: 'Manage team members, workspaces, and organization settings',
    },
    member: {
      title: 'Member',
      description: 'Create and edit content, strategies, and research',
    },
    viewer: {
      title: 'Viewer',
      description: 'View-only access to content and reports',
    },
  },
} as const;

export default ns;
