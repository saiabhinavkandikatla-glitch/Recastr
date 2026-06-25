// lib/factExtraction/index.ts
export { FactExtractor } from './extractor';
export {
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
} from './providers';
export type {
  ExtractionResult,
  ExtractionConfig,
  Fact,
  Quote,
  Statistic,
  Story,
  Example,
  Lesson,
  Insight,
  Entity,
  DateReference,
  FactExtractorProvider,
} from './shared/types';
export {
  validateChunk,
  validateConfig,
  validateExtractionResult,
  validateFact,
  validateQuote,
  validateStatistic,
  validateStory,
  // ... other validators if needed
} from './shared/validators';
export {
  normalizeWhitespace,
  normalizeQuotes,
  removeBoilerplate,
  normalizeUnicode,
  extractEvidenceText,
  calculateConfidence,
} from './shared/normalizers';