interface ErrorDetails {
  message: string;
  context: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  stack?: string;
  metadata?: Record<string, any>;
}

class ErrorTrackingService {
  private static readonly MAX_STORED_ERRORS = 100;
  private errors: ErrorDetails[] = [];

  trackError(error: Error | string | any, context: string = 'unknown', metadata?: Record<string, any>) {
    const errorDetails: ErrorDetails = {
      message: error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error)),
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

    // Log to console
    console.error(`[${errorDetails.timestamp}] [${errorDetails.severity}] ${context}: ${errorDetails.message}`);
    if (errorDetails.stack) {
      console.error('Stack trace:', errorDetails.stack);
    }
    if (metadata) {
      console.error('Metadata:', metadata);
    }

    return errorDetails;
  }

  getRecentErrors(limit: number = 100): ErrorDetails[] {
    return this.errors.slice(-limit);
  }

  clearOldLogs(maxAgeInDays: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeInDays);
    this.errors = this.errors.filter(error => new Date(error.timestamp) > cutoff);
  }

  private calculateSeverity(context: string): ErrorDetails['severity'] {
    const criticalContexts = ['database', 'authentication', 'game:state'];
    const warningContexts = ['validation', 'rate-limit'];
    const infoContexts = ['debug', 'log'];

    if (criticalContexts.some(ctx => context.includes(ctx))) return 'critical';
    if (warningContexts.some(ctx => context.includes(ctx))) return 'warning';
    if (infoContexts.some(ctx => context.includes(ctx))) return 'info';
    return 'error';
  }
}

export const errorTrackingService = new ErrorTrackingService(); 