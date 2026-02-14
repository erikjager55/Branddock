/**
 * Development Logger Utility
 * 
 * Provides structured logging that can be easily disabled in production.
 * In development mode, logs are displayed in the console with context.
 * In production mode, logs are suppressed unless explicitly enabled.
 */

const isDevelopment = process.env.NODE_ENV !== 'production';
const isDebugEnabled = typeof window !== 'undefined' && (window as any).__DEBUG_MODE__ === true;

// Enable debug mode by setting: window.__DEBUG_MODE__ = true in browser console

class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = isDevelopment || isDebugEnabled;
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(`[INFO] ${message}`, data !== undefined ? data : '');
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: any) {
    if (!this.enabled) return;
    console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
  }

  /**
   * Log errors (always enabled, even in production)
   */
  error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
  }

  /**
   * Log navigation events
   */
  navigation(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(`[NAV] ${message}`, data !== undefined ? data : '');
  }

  /**
   * Log user interactions
   */
  interaction(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(`[INTERACTION] ${message}`, data !== undefined ? data : '');
  }

  /**
   * Enable or disable logging programmatically
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Export a singleton instance
export const logger = new Logger();

// Also export the Logger class for testing
export { Logger };
