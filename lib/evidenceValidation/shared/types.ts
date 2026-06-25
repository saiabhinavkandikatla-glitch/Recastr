// lib/evidenceValidation/shared/types.ts

// Base validation result interface
export interface ValidationResult {
  factId: string;
  chunkId: string;
  evidenceText: string;
  matchedText: string | null;
  startOffset: number | null;
  endOffset: number | null;
  supported: boolean;
  validationScore: number; // 0-1
  validationReason: string;
  validatorProvider: 'gemini' | 'openai' | 'anthropic';
  validatorModel: string;
  validatorPromptVersion: string;
  validatorVersion: string; // e.g., "1.0.0"
  createdAt: string; // ISO timestamp
}

// Validation configuration
export interface ValidationConfig {
  validationThreshold: number; // Minimum score to consider validated (default 0.95)
  reviewThresholdLow: number; // Below this is rejected (default 0.80)
  reviewThresholdHigh: number; // Above this but below validationThreshold is NEEDS_REVIEW (default 0.94)
  enableRuleEngine: boolean; // Whether to apply rule-based validation
  enableLLMValidation: boolean; // Whether to use LLM for validation
  maxRetries: number; // Maximum API retry attempts
  timeoutMs: number; // Request timeout in milliseconds
}

// Evidence match details
export interface EvidenceMatch {
  text: string;
  startOffset: number;
  endOffset: number;
  similarityScore: number; // 0-1
}

// Validation rule interface
export interface ValidationRule {
  id: string;
  description: string;
  validate(fact: any, chunk: string, matchData: any): {
    passed: boolean;
    score: number; // 0.0 to 1.0
    reason: string;
  };
}

// Validation score components
export interface ValidationScore {
  evidenceOverlap: number; // 0-1
  characterSimilarity: number; // 0-1
  numericConsistency: number; // 0-1 (for statistics)
  namedEntityConsistency: number; // 0-1 (for entities)
  quoteIntegrity: number; // 0-1 (for quotes)
  dateConsistency: number; // 0-1 (for dates)
  contextCompleteness: number; // 0-1
  languageConfidence: number; // 0-1
  overall: number; // 0-1 weighted average
}

// Validator provider interface
export interface EvidenceValidatorProvider {
  validate(fact: any, chunk: string, config: ValidationConfig): Promise<ValidationResult>;
}

// Base fact interface (reused from fact extraction, but we'll define minimally here for independence)
export interface BaseFact {
  id: string;
  chunkId: string;
  evidenceText: string;
  sourceOffsets: {
    start: number;
    end: number;
  };
  // Other fields will be fact-type specific
}

// Validation status enum
export enum ValidationStatus {
  VALIDATED = 'VALIDATED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  REJECTED = 'REJECTED'
}