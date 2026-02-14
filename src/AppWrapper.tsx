/**
 * App Wrapper Component
 * 
 * Wraps the main App component with all context providers.
 * This is the new root component that should be used as the default export.
 */

import React from 'react';
import { AppProviders } from './contexts';
import App from './App';

export default function AppWrapper() {
  return (
    <AppProviders>
      <App />
    </AppProviders>
  );
}