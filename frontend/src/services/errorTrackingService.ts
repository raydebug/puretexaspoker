import { Player } from '../types/game';

export interface ErrorDetails {
  message: string;
  context: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  stack?: string;
  metadata?: Record<string, any>;
}

export interface ErrorStats {
  total: number;
  bySeverity: Record<string, number>;
  byContext: Record<string, number>;
  recentErrors: ErrorDetails[];
}

class ErrorTrackingService {
  private static readonly MAX_STORED_ERRORS = 100;
  private errors: ErrorDetails[] = [];
  private listeners: ((error: ErrorDetails) => void)[] = [];

  // Track a new error
  trackError(error: Error | string, context: string, metadata?: Record<string, any>) {
    const errorDetails: ErrorDetails = {
      message: error instanceof Error ? error.message : error,
      context,
      timestamp: new Date().toISOString(),
      severity: this.calculateSeverity(context),
      stack: error instanceof Error ? error.stack : undefined,
      metadata
    };

    // Store error
    this.errors.push(errorDetails);
    if (this.errors.length > ErrorTrackingService.MAX_STORED_ERRORS) {
      this.errors.shift(); // Remove oldest error
    }

    // Notify listeners
    this.notifyListeners(errorDetails);

    // Log to console with color coding
    this.logErrorToConsole(errorDetails);

    // Send to backend if critical
    if (errorDetails.severity === 'critical') {
      this.sendErrorToBackend(errorDetails);
    }

    return errorDetails;
  }

  // Subscribe to error events
  onError(callback: (error: ErrorDetails) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Get error statistics
  getStats(): ErrorStats {
    const stats: ErrorStats = {
      total: this.errors.length,
      bySeverity: {},
      byContext: {},
      recentErrors: this.errors.slice(-10) // Last 10 errors
    };

    this.errors.forEach(error => {
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      // Count by context
      stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
    });

    return stats;
  }

  // Clear all stored errors
  clearErrors() {
    this.errors = [];
  }

  // Get errors by context
  getErrorsByContext(context: string): ErrorDetails[] {
    return this.errors.filter(error => error.context === context);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorDetails['severity']): ErrorDetails[] {
    return this.errors.filter(error => error.severity === severity);
  }

  // Get errors within a time range
  getErrorsInTimeRange(startTime: Date, endTime: Date): ErrorDetails[] {
    return this.errors.filter(error => {
      const errorTime = new Date(error.timestamp);
      return errorTime >= startTime && errorTime <= endTime;
    });
  }

  private calculateSeverity(context: string): ErrorDetails['severity'] {
    // Define severity based on context
    const criticalContexts = ['connect', 'gameState', 'seat:accepted'];
    const warningContexts = ['observer:join', 'observer:left'];
    const infoContexts = ['emitOnlineUsersUpdate'];

    if (criticalContexts.includes(context)) return 'critical';
    if (warningContexts.includes(context)) return 'warning';
    if (infoContexts.includes(context)) return 'info';
    return 'error';
  }

  private notifyListeners(error: ErrorDetails) {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  private logErrorToConsole(error: ErrorDetails) {
    const colors = {
      info: '\x1b[36m', // Cyan
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      critical: '\x1b[35m', // Magenta
      reset: '\x1b[0m'
    };

    const color = colors[error.severity] || colors.reset;
    console.log(
      `${color}[${error.timestamp}] [${error.severity.toUpperCase()}] ${error.context}: ${error.message}${colors.reset}`
    );

    if (error.stack) {
      console.log(`${colors.reset}Stack trace:${colors.reset}\n${error.stack}`);
    }

    if (error.metadata) {
      console.log(`${colors.reset}Metadata:${colors.reset}`, error.metadata);
    }
  }

  private async sendErrorToBackend(error: ErrorDetails) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(error)
      });
    } catch (e) {
      console.error('Failed to send error to backend:', e);
    }
  }
}

export const errorTrackingService = new ErrorTrackingService(); 