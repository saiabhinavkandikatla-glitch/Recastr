// lib/chunking/strategies/paragraphStrategy.ts

import { BaseChunkingStrategy } from '../shared/types';
import { ChunkingResult, ChunkingConfig, ChunkingError } from '../shared/types';
import { ValidationError } from '../shared/errors';

export class ParagraphChunker implements BaseChunkingStrategy {
  /**
   * Split text into chunks based on paragraph boundaries.
   * Attempts to keep paragraphs intact, but may split large paragraphs to meet size constraints.
   */

  async validate(): Promise<void> {
    // No specific validation needed
  }

  async split(text: string, config: ChunkingConfig): Promise<ChunkingResult> {
    try {
      // Implementation would:
      // 1. Split text into paragraphs (by double newline or similar)
      // 2. For each paragraph, if it's too large, split it further (e.g., by sentences or fixed size)
      // 3. Group paragraphs into chunks until reaching the target token count
      // 4. Apply overlap between chunks if configured
      // 5. Create Chunk objects with appropriate headingPath (if available)

      // Placeholder
      const chunks: any[] = [];

      return {
        chunks,
        metadata: {
          strategy: 'paragraph',
          config,
          totalChunks: chunks.length,
          processingTimeMs: 0,
          sourceTextLength: text.length,
        },
        success: true,
      };
    } catch (error) {
      if (error instanceof ChunkingError) {
        throw error;
      }
      throw new ChunkingError(
        `Paragraph chunking failed: ${error instanceof Error ? error.message : String(error)}`,
        'CHUNKING_ERROR',
        false
      );
    }
  }

  estimateTokens(text: string): number {
    // Same as in FixedSizeChunker
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round(wordCount * 1.3);
  }
}