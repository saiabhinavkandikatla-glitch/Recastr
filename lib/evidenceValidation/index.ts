// lib/evidenceValidation/index.ts
export { EvidenceValidator } from './validator';
export {
  GeminiValidator,
  NIMValidator,
  AnthropicValidator,
} from './providers';
export type {
  ValidationResult,
  ValidationConfig,
  ValidationScore,
  EvidenceMatch,
  ValidationStatus
} from './shared/types';
export {
  validateChunk,
  validateConfig
} from './shared/validators';
export {
  normalizeWhitespace,
  normalizeQuotes,
  removeBoilerplate,
  normalizeUnicode,
  extractEvidenceText,
  calculateConfidence
} from './shared/normalizers';