// Canonical (source-of-truth) English UI strings — `common` namespace.
const common = {
  brand: {
    name: 'Branddock',
  },
  appearance: {
    title: 'Appearance',
    displayLanguageTitle: 'Display language',
    displayLanguageHelp:
      'Language for menus, buttons and labels across Branddock. This does not change the language your content is written in.',
    scopeOnlyYou: 'Only you',
    saved: 'Display language updated',
    saveFailed: 'Could not update display language',
  },
  auth: {
    resetPasswordTitle: 'Reset password',
    resetPasswordSubtitle: "Enter your email and we'll send you a reset link.",
    resetSent: "If an account exists with this email, you'll receive a reset link.",
    backToLogin: 'Back to login',
    emailLabel: 'E-mail',
    emailPlaceholder: 'name@company.com',
    sending: 'Sending...',
    sendResetLink: 'Send Reset Link',
    signIn: 'Sign in',
    register: 'Register',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    passwordPlaceholder: 'Enter password',
    signingIn: 'Signing in...',
    nameLabel: 'Name',
    namePlaceholder: 'Your full name',
    passwordMinPlaceholder: 'Minimum 8 characters',
    creating: 'Creating...',
    createAccount: 'Create account',
    loginFailed: 'Login failed',
    registrationFailed: 'Registration failed',
    resetNotConfigured: 'Password reset is not yet configured. Please contact support.',
    genericError: 'Something went wrong. Please try again.',
  },
} as const;

export default common;
