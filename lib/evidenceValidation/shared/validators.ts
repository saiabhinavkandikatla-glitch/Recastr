import type { ValidationConfig, ValidationResult } from "./types";

export function validateChunk(chunk: string) {
  if (!chunk || chunk.trim().length === 0) {
    throw new Error("Validation chunk cannot be empty");
  }
}

export function validateConfig(config: ValidationConfig) {
  if (config.validationThreshold < 0 || config.validationThreshold > 1) {
    throw new Error("validationThreshold must be between 0 and 1");
  }
  if (config.maxRetries < 0) {
    throw new Error("maxRetries cannot be negative");
  }
  if (config.timeoutMs <= 0) {
    throw new Error("timeoutMs must be positive");
  }
}

export function validateValidationResult(result: ValidationResult) {
  if (!result.factId || !result.chunkId) {
    throw new Error("Validation result must include factId and chunkId");
  }
}
