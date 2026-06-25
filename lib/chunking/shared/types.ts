// lib/chunking/shared/types.ts

export interface Chunk {
  id: string;
  text: string;
  index: number;
  tokenCount: number;
  wordCount: number;
  charCount: number;
  startOffset: number;
  endOffset: number;
  headingPath: string[];
  contentHash: string;
  metadata: Record<string, any>;
}

export interface ChunkMetadata {
  strategy: string;
  config: ChunkingConfig;
  totalChunks: number;
  processingTimeMs: number;
  sourceTextLength: number;
}

export interface ChunkingResult {
  chunks: Chunk[];
  metadata: ChunkMetadata;
  success: boolean;
  error?: ChunkingError;
}

export interface ChunkingError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

export interface ChunkingConfig {
  targetTokenCount: number; // 500, 1000, 1500, 2000
  overlapTokenCount: number; // 0-20% of targetTokenCount
  preserveParagraphs: boolean;
  preserveHeadings: boolean;
  preserveLists: boolean;
  language: string; // ISO 639-1
  minChunkSize: number;
  maxChunkSize: number;
}

export interface BaseChunkingStrategy {
  /**
   * Split the input text into chunks based on the strategy and configuration.
   * @param text - The normalized text to chunk.
   * @param config - The chunking configuration.
   * @returns A promise that resolves to a chunking result.
   */
  split(text: string, config: ChunkingConfig): Promise<ChunkingResult>;

  /**
   * Validate the strategy's configuration or prerequisites.
   * @returns A promise that resolves if valid, rejects with a ValidationError if not.
   */
  validate(): Promise<void>;

  /**
   * Estimate the number of tokens in the given text.
   * @param text - The text to estimate.
   * @returns The estimated token count.
   */
  estimateTokens(text: string): number;
}