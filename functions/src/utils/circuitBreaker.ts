import * as logger from 'firebase-functions/logger';

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening (default: 3)
  recoveryTimeout: number;     // Time to wait before testing (default: 5 min)
  successThreshold: number;    // Successes before closing (default: 2)
}

/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by:
 * 1. Opening circuit after N consecutive failures
 * 2. Automatically testing recovery after timeout
 * 3. Closing circuit after successful recovery
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  
  constructor(
    private name: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = {
      failureThreshold: config?.failureThreshold || 3,
      recoveryTimeout: config?.recoveryTimeout || 5 * 60 * 1000, // 5 min
      successThreshold: config?.successThreshold || 2,
    };
  }
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if recovery timeout has passed
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.recoveryTimeout) {
        logger.info(`Circuit breaker ${this.name}: Testing recovery (HALF_OPEN)`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
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
  
  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        logger.info(`Circuit breaker ${this.name}: Recovered (CLOSED)`);
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }
  
  /**
   * Record failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      logger.error(`Circuit breaker ${this.name}: Too many failures (OPEN)`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
      this.state = CircuitState.OPEN;
    }
  }
  
  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
  
  /**
   * Get current state
   */
  getState(): string {
    return this.state;
  }
  
  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info(`Circuit breaker ${this.name}: Reset to CLOSED`);
  }
}

