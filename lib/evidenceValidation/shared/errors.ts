// lib/evidenceValidation/shared/errors.ts

export class ValidationError extends Error {
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

export class EvidenceMismatchError extends ValidationError {
  constructor(message: string, recoverable = false) {
    super(message, 'EVIDENCE_MISMATCH_ERROR', recoverable);
  }
}

export class MissingEvidenceError extends ValidationError {
  constructor(message: string, recoverable = false) {
    super(message, 'MISSING_EVIDENCE_ERROR', recoverable);
  }
}

export class NumericMismatchError extends ValidationError {
  constructor(message: string, recoverable = false) {
    super(message, 'NUMERIC_MISMATCH_ERROR', recoverable);
  }
}

export class QuoteMismatchError extends ValidationError {
  constructor(message: string, recoverable = false) {
    super(message, 'QUOTE_MISMATCH_ERROR', recoverable);
  }
}

export class EntityMismatchError extends ValidationError {
  constructor(message: string, recoverable = false) {
    super(message, 'ENTITY_MISMATCH_ERROR', recoverable);
  }
}

export class ContextMismatchError extends ValidationError {
  constructor(message: string, recoverable = false) {
    super(message, 'CONTEXT_MISMATCH_ERROR', recoverable);
  }
}