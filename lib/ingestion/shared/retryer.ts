// Retry strategy for the ingestion layer

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentiallyBackoff: boolean;
  retryableErrors: Set<string>; // Error codes that should trigger retry
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentiallyBackoff: true,
  retryableErrors: new Set([
    'EXTERNAL_SERVICE_ERROR',
    'NETWORK_ERROR',
    'TIMEOUT_ERROR'
  ])
};

export class Retryer {
  static async execute<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = error instanceof Error &&
          ('code' in (error as any)) &&
          opts.retryableErrors.has((error as any).code);

        if (!isRetryable || attempt === opts.maxAttempts) {
          throw error;
        }

        // Calculate delay
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1),
          opts.maxDelayMs
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError; // Should never reach here
  }
}