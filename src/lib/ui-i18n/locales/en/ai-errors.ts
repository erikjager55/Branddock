// English UI strings — `ai-errors` namespace. Same key shape as nl/.
const ns = {
  unavailable: {
    default: {
      title: 'The AI model is currently unavailable',
      body: 'Generating is not possible right now. This is on the AI provider, not your input. Please try again shortly.',
      toastDescription: 'Generating is not possible right now — please try again shortly.',
    },
    authentication: {
      title: 'AI model not configured',
      body: 'There is a problem with the AI configuration. Please contact your administrator.',
      toastDescription: 'AI configuration problem — please contact your administrator.',
    },
    rate_limit: {
      title: 'Too many requests',
      body: 'Too many requests were sent. Please wait a moment and try again.',
      toastDescription: 'Please wait a moment and try again.',
    },
  },
  toastTitle: 'AI model unavailable',
  genericError: 'Something went wrong. Please try again.',
  retry: 'Try again',
  retrying: 'Please wait, retrying…',
} as const;

export default ns;
