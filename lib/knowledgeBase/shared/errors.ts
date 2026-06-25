// lib/knowledgeBase/shared/errors.ts

export class KBError extends Error {
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

export class EntityResolutionError extends KBError {
  constructor(message: string, recoverable = false) {
    super(message, 'ENTITY_RESOLUTION_ERROR', recoverable);
  }
}

export class RelationshipBuildingError extends KBError {
  constructor(message: string, recoverable = false) {
    super(message, 'RELATIONSHIP_BUILDING_ERROR', recoverable);
  }
}

export class CanonicalizationError extends KBError {
  constructor(message: string, recoverable = false) {
    super(message, 'CANONICALIZATION_ERROR', recoverable);
  }
}

export class MergeError extends KBError {
  constructor(message: string, recoverable = false) {
    super(message, 'MERGE_ERROR', recoverable);
  }
}

export class GraphBuildError extends KBError {
  constructor(message: string, recoverable = false) {
    super(message, 'GRAPH_BUILD_ERROR', recoverable);
  }
}

export class ValidationError extends KBError {
  constructor(message: string, recoverable = false) {
    super(message, 'VALIDATION_ERROR', recoverable);
  }
}