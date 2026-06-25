// Error hierarchy for the ingestion layer

export class BaseError extends Error {
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

export class ValidationError extends BaseError {
  constructor(message: string, recoverable = false) {
    super(message, 'VALIDATION_ERROR', recoverable);
  }
}

export class ExtractionError extends BaseError {
  constructor(message: string, recoverable = false) {
    super(message, 'EXTRACTION_ERROR', recoverable);
  }
}

export class NormalizationError extends BaseError {
  constructor(message: string, recoverable = false) {
    super(message, 'NORMALIZATION_ERROR', recoverable);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(message: string, recoverable = true) {
    super(message, 'EXTERNAL_SERVICE_ERROR', recoverable);
  }
}