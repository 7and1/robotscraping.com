export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  halfOpenCalls: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenMaxCalls: 3,
};

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private halfOpenCalls: number = 0;
  private readonly options: CircuitBreakerOptions;
  private readonly key: string;

  constructor(key: string, options?: Partial<CircuitBreakerOptions>) {
    this.key = key;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls,
    };
  }

  getKey(): string {
    return this.key;
  }

  private shouldAttemptReset(): boolean {
    return (
      this.state === 'open' && Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs
    );
  }

  private reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.halfOpenCalls = 0;
  }

  private open(): void {
    this.state = 'open';
    this.lastFailureTime = Date.now();
  }

  private enterHalfOpen(): void {
    this.state = 'half-open';
    this.halfOpenCalls = 0;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open' && this.shouldAttemptReset()) {
      this.enterHalfOpen();
    }

    if (this.state === 'open') {
      const remainingMs = this.options.resetTimeoutMs - (Date.now() - this.lastFailureTime);
      const remainingSec = Math.ceil(remainingMs / 1000);
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN for ${this.key}. ${remainingSec}s until reset.`,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
        this.reset();
      }
    } else if (this.state === 'closed') {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.open();
    } else if (this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  forceOpen(): void {
    this.open();
  }

  forceReset(): void {
    this.reset();
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

interface ProviderCircuitBreaker {
  openai?: CircuitBreaker;
  anthropic?: CircuitBreaker;
  openrouter?: CircuitBreaker;
}

const breakers: ProviderCircuitBreaker = {};

export function getCircuitBreaker(
  provider: 'openai' | 'anthropic' | 'openrouter',
  options?: Partial<CircuitBreakerOptions>,
): CircuitBreaker {
  if (!breakers[provider]) {
    breakers[provider] = new CircuitBreaker(provider, options);
  }
  return breakers[provider]!;
}

export function getAllCircuitBreakerStates(): Record<string, CircuitBreakerState> {
  const states: Record<string, CircuitBreakerState> = {};
  for (const [key, breaker] of Object.entries(breakers)) {
    if (breaker) {
      states[key] = breaker.getState();
    }
  }
  return states;
}

export function resetCircuitBreaker(provider: 'openai' | 'anthropic' | 'openrouter'): void {
  if (breakers[provider]) {
    breakers[provider]?.forceReset();
  }
}

export function isRetryableWithCircuitBreaker(error: unknown): boolean {
  if (error instanceof CircuitBreakerOpenError) {
    return false;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'etimedout',
      'econnreset',
      'enotfound',
      'network error',
      'rate limit',
      'too many requests',
      'server error',
      '502',
      '503',
      '504',
    ];
    return retryablePatterns.some((pattern) => message.includes(pattern));
  }
  return false;
}
