import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logging/logger.service';
import { ExternalApiException } from '../exceptions';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

@Injectable()
export class CircuitBreakerService {
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 60 seconds
  private readonly halfOpenMaxAttempts = 3;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('CircuitBreakerService');
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.getCircuit(serviceName);

    // Check if circuit is open
    if (circuit.state === 'OPEN') {
      const now = Date.now();
      if (now - circuit.lastFailureTime > this.resetTimeout) {
        this.logger.log(`Circuit entering HALF_OPEN state`, serviceName, {
          serviceName,
        });
        circuit.state = 'HALF_OPEN';
        circuit.failures = 0;
      } else {
        this.logger.warn(`Circuit is OPEN, rejecting request`, serviceName, {
          serviceName,
          timeSinceFailure: now - circuit.lastFailureTime,
        });

        if (fallback) {
          this.logger.log(
            `Executing fallback for ${serviceName}`,
            serviceName,
          );
          return await fallback();
        }

        throw new ExternalApiException(
          `Service ${serviceName} is temporarily unavailable (circuit open)`,
          serviceName,
          { state: circuit.state, failures: circuit.failures },
        );
      }
    }

    try {
      const result = await operation();

      // Success - reset circuit if it was half-open
      if (circuit.state === 'HALF_OPEN') {
        this.logger.log(`Circuit closing after successful recovery`, serviceName, {
          serviceName,
        });
        circuit.state = 'CLOSED';
        circuit.failures = 0;
      }

      return result;
    } catch (error) {
      circuit.failures++;
      circuit.lastFailureTime = Date.now();

      this.logger.error(
        `Circuit breaker detected failure`,
        error.stack,
        serviceName,
        {
          serviceName,
          failures: circuit.failures,
          threshold: this.failureThreshold,
        },
      );

      // Check if we should open the circuit
      if (circuit.failures >= this.failureThreshold) {
        circuit.state = 'OPEN';
        this.logger.error(
          `Circuit opened due to repeated failures`,
          undefined,
          serviceName,
          {
            serviceName,
            failures: circuit.failures,
          },
        );
      }

      // Try fallback if available
      if (fallback) {
        this.logger.log(`Executing fallback for ${serviceName}`, serviceName);
        try {
          return await fallback();
        } catch (fallbackError) {
          this.logger.error(
            `Fallback also failed for ${serviceName}`,
            fallbackError.stack,
            serviceName,
          );
          throw error; // Throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Get or create circuit state
   */
  private getCircuit(serviceName: string): CircuitBreakerState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
      });
    }
    return this.circuits.get(serviceName)!;
  }

  /**
   * Manually reset a circuit
   */
  resetCircuit(serviceName: string): void {
    this.circuits.set(serviceName, {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
    });
    this.logger.log(`Circuit manually reset`, serviceName, { serviceName });
  }

  /**
   * Get circuit status
   */
  getCircuitStatus(serviceName: string): CircuitBreakerState | undefined {
    return this.circuits.get(serviceName);
  }

  /**
   * Get all circuit statuses
   */
  getAllCircuitStatuses(): Record<string, CircuitBreakerState> {
    const statuses: Record<string, CircuitBreakerState> = {};
    this.circuits.forEach((state, name) => {
      statuses[name] = state;
    });
    return statuses;
  }
}
