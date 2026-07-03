// Canonical (source-of-truth) English UI strings — `settings-account` namespace.
const settingsAccount = {
  tab: {
    title: 'Account Settings',
    subtitle: 'Manage your profile, security, and account preferences.',
  },
  profile: {
    title: 'Profile Information',
    emailLabel: 'Email',
    verified: 'Verified',
    firstName: 'First Name',
    lastName: 'Last Name',
    firstNamePlaceholder: 'Your first name',
    lastNamePlaceholder: 'Your last name',
    emailPlaceholder: 'your@email.com',
    jobTitle: 'Job Title',
    jobTitlePlaceholder: 'e.g. Brand Strategist',
    phone: 'Phone',
    phonePlaceholder: '+31 6 1234 5678',
    save: 'Save Changes',
  },
  avatar: {
    alt: 'Avatar',
    upload: 'Upload',
    remove: 'Remove',
    promptUrl: 'Enter avatar URL (demo stub):',
  },
  password: {
    title: 'Change Password',
    currentLabel: 'Current Password',
    currentPlaceholder: 'Enter current password',
    newLabel: 'New Password',
    newPlaceholder: 'Minimum 8 characters',
    confirmLabel: 'Confirm New Password',
    confirmPlaceholder: 'Re-enter new password',
    minError: 'Must be at least 8 characters',
    matchError: 'Passwords do not match',
    minValidation: 'New password must be at least 8 characters.',
    matchValidation: 'Passwords do not match.',
    changeFailed: 'Failed to change password.',
    success: 'Password updated successfully.',
    update: 'Update Password',
  },
  email: {
    title: 'Email Preferences',
    toggles: {
      productUpdates: {
        label: 'Product Updates',
        description: 'Receive emails about new features and product improvements.',
      },
      researchNotifications: {
        label: 'Research Notifications',
        description: 'Get notified when research results are ready or need attention.',
      },
      teamActivity: {
        label: 'Team Activity',
        description: 'Stay updated on team member actions and collaboration events.',
      },
      marketing: {
        label: 'Marketing',
        description: 'Receive tips, best practices, and promotional content.',
      },
    },
  },
  connectedAccounts: {
    title: 'Connected Accounts',
    empty: 'No connected accounts yet.',
    connected: 'Connected',
    connect: 'Connect',
    disconnect: 'Disconnect',
  },
  dataExport: {
    title: 'Download All Data',
    description:
      'Export all your workspace data as a single JSON file. Includes brand assets, personas, products, campaigns, trends, strategies, and more.',
    exporting: 'Exporting...',
    forbidden: 'Only owners and admins can export workspace data.',
    failed: 'Export failed. Please try again.',
  },
  dangerZone: {
    title: 'Delete Account',
    description:
      'Permanently delete your account and all associated data. This action cannot be undone and will remove all your workspaces, brand assets, and team memberships.',
    deleteButton: 'Delete Account',
    confirmDelete:
      'Are you sure you want to delete your account? This action cannot be undone. All your data, workspaces, and team memberships will be permanently removed.',
  },
} as const;

export default settingsAccount;
