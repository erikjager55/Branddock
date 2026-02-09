"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-text-dark/60 max-w-md mb-6">
            An unexpected error occurred. Please try again or contact support if
            the problem persists.
          </p>
          {this.state.error && (
            <pre className="text-xs text-text-dark/40 bg-surface-dark border border-border-dark rounded-lg p-3 max-w-lg overflow-auto mb-6">
              {this.state.error.message}
            </pre>
          )}
          <Button
            variant="primary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
