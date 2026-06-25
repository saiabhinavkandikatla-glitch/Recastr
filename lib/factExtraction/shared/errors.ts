// lib/factExtraction/shared/errors.ts

export class ExtractionError extends Error {
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

export class ValidationError extends ExtractionError {
  constructor(message: string, recoverable = false) {
    super(message, 'VALIDATION_ERROR', recoverable);
  }
}

export class ProviderError extends ExtractionError {
  constructor(message: string, recoverable = true) {
    super(message, 'PROVIDER_ERROR', recoverable);
  }
}

export class ParsingError extends ExtractionError {
  constructor(message: string, recoverable = false) {
    super(message, 'PARSING_ERROR', recoverable);
  }
}

export class NormalizationError extends ExtractionError {
  constructor(message: string, recoverable = false) {
    super(message, 'NORMALIZATION_ERROR', recoverable);
  }
}

export class DeduplicationError extends ExtractionError {
  constructor(message: string, recoverable = false) {
    super(message, 'DEDUPLICATION_ERROR', recoverable);
  }
}