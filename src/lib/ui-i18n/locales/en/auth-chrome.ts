// Canonical (source-of-truth) English UI strings — `auth-chrome` namespace.
// Auth chrome around the login flow: org/workspace switcher, social login
// buttons, and the email/social divider.
const ns = {
  orgSwitcher: {
    selectOrganization: 'Select organization',
    organizationsHeading: 'Organizations',
    workspacesHeading: 'Workspaces',
    newWorkspacePlaceholder: 'Workspace name...',
    add: 'Add',
    newWorkspace: 'New workspace',
    createFailed: 'Failed to create workspace',
    newWorkspaceLimitReached: 'Workspace limit reached ({{current}}/{{limit}}) — upgrade your plan to add more.',
  },
  socialProviders: {
    google: 'Continue with Google',
    microsoft: 'Continue with Microsoft',
    apple: 'Continue with Apple',
  },
  socialLogin: {
    loginFailed: 'Login failed',
    popupBlocked: 'Popup blocked. Please allow popups for this site.',
    accountExists:
      'This email address is already linked to another account. Try signing in with email.',
    genericError: 'Something went wrong. Please try again.',
  },
  divider: {
    orWithEmail: 'or log in with email',
  },
} as const;

export default ns;
