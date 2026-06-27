// lib/factExtraction/extractor.ts

import { ExtractedFact, Quote, Statistic, Story, Example, Lesson, Insight, Entity, DateReference, ExtractionResult, ExtractionConfig } from './shared/types';
import { ValidationError } from './shared/errors';
import { validateChunk, validateConfig, validateExtractionResult, validateExtractionFacts } from './shared/validators';
import { normalizeWhitespace, normalizeQuotes, removeBoilerplate, normalizeUnicode, extractEvidenceText, calculateConfidence } from './shared/normalizers';

// FactExtractorProvider interface (defined here for simplicity, but could be imported from types)
export interface FactExtractorProvider {
  extract(chunk: string, config: ExtractionConfig): Promise<ExtractionResult>;
}

/**
 * BaseFactExtractor provides common functionality for fact extraction
 */
export abstract class BaseFactExtractor {
  protected abstract provider: FactExtractorProvider;

  // Common methods that can be shared by concrete extractors
  protected validateInput(chunk: string): void {
    if (!chunk || chunk.trim().length === 0) {
      throw new Error('Chunk cannot be empty');
    }
  }

  protected validateConfig(config: ExtractionConfig): void {
    if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    if (config.maxRetries < 0) {
      throw new Error('Max retries cannot be negative');
    }
    if (config.timeoutMs <= 0) {
      throw new Error('Timeout must be positive');
    }
  }

  /**
   * Normalize the extracted text
   */
  protected normalizeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .trim();
  }

  /**
   * Deduplicate facts based on evidence text and fact type
   * Simple implementation: remove exact duplicates
   */
  protected deduplicateFacts<T extends ExtractedFact>(facts: T[]): T[] {
    const seen = new Set<string>();
    return facts.filter(fact => {
      const key = `${fact.factType}:${fact.evidenceText}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate confidence for each fact-level confidence based on evidence text match
   */
  protected calculateFactConfidence(fact: ExtractedFact, originalChunk: string): number {
    // Use the evidence text and original chunk to calculate confidence
    return calculateConfidence(fact.evidenceText, originalChunk);
  }

  /**
   * Apply confidence threshold filtering
   */
  protected filterByConfidence<T extends ExtractedFact>(facts: T[], threshold: number): T[] {
    return facts.filter(fact => fact.confidence >= threshold);
  }

  // This would be implemented in concrete classes
  abstract extract(chunk: string, config?: Partial<ExtractionConfig>): Promise<ExtractionResult>;
}

/**
 * Main FactExtractor class that orchestrates the extraction process
 */
export class FactExtractor extends BaseFactExtractor {
  protected provider: FactExtractorProvider;

  constructor(provider: FactExtractorProvider) {
    super();
    this.provider = provider;
  }

  async extract(chunk: string, config: Partial<ExtractionConfig> = {}): Promise<ExtractionResult> {
    try {
      // Step 1: Validate input
      validateChunk(chunk);

      // Step 2: Validate configuration (use defaults where missing)
      const validatedConfig: ExtractionConfig = {
        confidenceThreshold: config.confidenceThreshold ?? 0.7,
        enableDeduplication: config.enableDeduplication ?? true,
        language: config.language ?? 'en',
        maxRetries: config.maxRetries ?? 3,
        timeoutMs: config.timeoutMs ?? 30000,
        ...config
      };
      validateConfig(validatedConfig);

      // Step 3: Normalize the chunk (optional preprocessing)
      const normalizedChunk = this.normalizeChunk(chunk);

      // Step 4: Extract using the provider with retry logic
      let result: ExtractionResult | null = null;

      for (let attempt = 0; attempt <= validatedConfig.maxRetries; attempt++) {
        try {
          result = await this.provider.extract(normalizedChunk, validatedConfig);
          break; // Success, exit retry loop
        } catch (error) {
          if (attempt === validatedConfig.maxRetries) {
            throw error; // Last attempt failed, propagate error
          }
          // Wait before retry (exponential backoff with jitter)
          await this.delay(Math.pow(2, attempt) * 100 + Math.random() * 100);
        }
      }

      if (!result) {
        throw new Error("Fact extraction returned no result.");
      }

      // Step 5: Validate the provider's result structure
      validateExtractionResult(result);

      // Step 6: Post-process the result
      const processedResult = await this.postProcessResult(result, normalizedChunk, validatedConfig);

      // Step 7: Validate the processed result
      validateExtractionResult(processedResult);

      return processedResult;
    } catch (error) {
      // Return error in the result format
      if (error instanceof Error) {
        return {
          facts: [],
          quotes: [],
          statistics: [],
          stories: [],
          examples: [],
          lessons: [],
          insights: [],
          entities: [],
          dates: [],
          success: false,
          error: {
            message: error.message,
            // In a real implementation, we would have proper error classes
            // For now, we'll use a simple object
            // This should match the ExtractionError type from errors.ts
            // but since we're avoiding circular dependency, we'll keep it simple
          } as any
        };
      }
      throw error;
    }
  }

  /**
   * Normalize the input chunk before extraction
   */
  private normalizeChunk(chunk: string): string {
    // Apply normalization steps
    let normalized = normalizeWhitespace(chunk);
    normalized = normalizeQuotes(normalized);
    normalized = removeBoilerplate(normalized);
    normalized = normalizeUnicode(normalized);
    return normalized;
  }

  /**
   * Delay function for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Post-process the extraction result: normalize, deduplicate, calculate confidence, filter by threshold
   */
  private async postProcessResult(
    result: ExtractionResult,
    normalizedChunk: string,
    config: ExtractionConfig
  ): Promise<ExtractionResult> {
    // Process each fact category
    const processCategory = <T extends ExtractedFact>(facts: T[], factType: string): T[] => {
      // Skip if no facts
      if (!facts || facts.length === 0) return [];

      // Normalize evidence text and calculate confidence
      const processedFacts = facts.map(fact => {
        // Ensure factType is set
        if (!fact.factType) {
          fact.factType = factType as any;
        }

        // Normalize evidence text
        fact.evidenceText = this.normalizeText(fact.evidenceText);

        // Calculate confidence based on evidence match
        fact.confidence = this.calculateFactConfidence(fact, normalizedChunk);

        return fact;
      });

      // Deduplicate if enabled
      if (config.enableDeduplication) {
        return this.deduplicateFacts(processedFacts);
      }

      return processedFacts;
    };

    // Apply confidence threshold filtering
    const filterAndProcess = <T extends ExtractedFact>(facts: T[], factType: string): T[] => {
      let processed = processCategory(facts, factType);
      processed = this.filterByConfidence(processed, config.confidenceThreshold);
      return processed;
    };

    // Process each category
    const processedResult: ExtractionResult = {
      facts: filterAndProcess(result.facts, 'fact'),
      quotes: filterAndProcess(result.quotes, 'quote'),
      statistics: filterAndProcess(result.statistics, 'statistic'),
      stories: filterAndProcess(result.stories, 'story'),
      examples: filterAndProcess(result.examples, 'example'),
      lessons: filterAndProcess(result.lessons, 'lesson'),
      insights: filterAndProcess(result.insights, 'insight'),
      entities: filterAndProcess(result.entities, 'entity'),
      dates: filterAndProcess(result.dates, 'date'),
      success: true
    };

    return processedResult;
  }
}
