// Base source extractor interface that all extractors must implement

import {
  SourceMetadata,
  NormalizedContent,
  ExtractionResponse
} from './shared/types';

export interface BaseSourceExtractor {
  /**
   * Validates that the source can be processed by this extractor
   * @returns Promise that resolves if valid, rejects with ValidationError if not
   */
  validate(): Promise<void>;

  /**
   * Extracts raw content from the source
   * @returns Promise resolving to extracted content (type varies by implementer)
   */
  extract(): Promise<any>;

  /**
   * Normalizes extracted content into standardized text format
   * @param rawContent - Raw output from extract() method
   * @returns Normalized content ready for storage
   */
  normalize(rawContent: any): Promise<NormalizedContent>;

  /**
   * Extracts metadata specific to the source type
   * @returns Promise resolving to metadata object
   */
  getMetadata(): Promise<SourceMetadata>;

  /**
   * Main entry point - runs full extraction pipeline
   * @returns ExtractionResponse containing normalized content or error
   */
  process(): Promise<ExtractionResponse<NormalizedContent>>;
}