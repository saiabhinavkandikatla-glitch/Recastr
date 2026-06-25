// lib/chunking/shared/errors.ts

export class ChunkingError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;

  constructor(message: string, code: string, recoverable = false) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.recoverable = recoverable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ChunkingError {
  constructor(message: string, recoverable = false) {
    super(message, 'VALIDATION_ERROR', recoverable);
  }
}

export class ConfigurationError extends ChunkingError {
  constructor(message: string, recoverable = false) {
    super(message, 'CONFIGURATION_ERROR', recoverable);
  }
}

export class StrategyError extends ChunkingError {
  constructor(message: string, recoverable = false) {
    super(message, 'STRATEGY_ERROR', recoverable);
  }
}