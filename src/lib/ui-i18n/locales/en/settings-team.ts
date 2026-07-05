// Canonical (source-of-truth) English UI strings — `settings-team` namespace.
const settingsTeam = {
  title: 'Team Management',
  subtitle: 'Manage your team members, invitations, and role permissions.',
  roles: {
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
  },
  plan: {
    seatsUsed: '{{used}} of {{limit}} seats used',
    unlimited: 'Unlimited',
    inviteMember: 'Invite Member',
    upgradePlan: 'Upgrade Plan',
    unlimitedSeatsBeta: 'Unlimited seats during beta',
  },
  membersTable: {
    title: 'Team Members ({{total}})',
    empty: {
      title: 'No team members',
      description:
        'Invite team members to start collaborating on your brand strategy.',
    },
    columns: {
      member: 'Member',
      role: 'Role',
      status: 'Status',
      joined: 'Joined',
      actions: 'Actions',
    },
  },
  memberRow: {
    active: 'Active',
    inactive: 'Inactive',
    changeRole: 'Change Role',
    remove: 'Remove',
  },
  pending: {
    title: 'Pending Invitations',
    empty: 'No pending invitations',
    sent: 'Sent {{date}}',
    expiresIn_one: 'Expires in {{count}} day',
    expiresIn_other: 'Expires in {{count}} days',
    expired: 'Expired',
    resend: 'Resend',
    cancel: 'Cancel',
  },
  invite: {
    title: 'Invite Team Member',
    subtitle: 'Send an invitation to collaborate on your workspace.',
    cancel: 'Cancel',
    send: 'Send Invitation',
    emailLabel: 'Email address',
    emailPlaceholder: 'colleague@company.com',
    roleLabel: 'Role',
    rolePlaceholder: 'Select a role...',
    errorAlreadyInvited: 'This email has already been invited.',
    errorSeatLimit:
      'Seat limit reached. Upgrade your plan to invite more members.',
    errorSendFailed: 'Failed to send invitation',
  },
  permissions: {
    title: 'Role Permissions',
    permission: 'Permission',
    canManageMembers: 'Manage Members',
    canManageBilling: 'Manage Billing',
    canDeleteWorkspace: 'Delete Workspace',
    canInvite: 'Invite',
    canEditContent: 'Edit Content',
    canViewContent: 'View Content',
  },
} as const;

export default settingsTeam;
