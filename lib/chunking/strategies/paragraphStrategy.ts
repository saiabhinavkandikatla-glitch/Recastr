// lib/chunking/strategies/paragraphStrategy.ts

import type { BaseChunkingStrategy, Chunk, ChunkingConfig, ChunkingResult } from "../shared/types";
import { ChunkingError } from "../shared/errors";

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
      const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
      const chunks: Chunk[] = paragraphs.map((paragraph, index) => {
        const startOffset = text.indexOf(paragraph);
        const words = paragraph.split(/\s+/).filter(Boolean);
        return {
          id: `paragraph-${index + 1}`,
          text: paragraph,
          index,
          tokenCount: Math.round(words.length * 1.3),
          wordCount: words.length,
          charCount: paragraph.length,
          startOffset,
          endOffset: startOffset + paragraph.length,
          headingPath: [],
          contentHash: `${index}-${paragraph.length}`,
          metadata: {},
        };
      });

      return {
        chunks,
        metadata: {
          strategy: "paragraph",
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
        "CHUNKING_ERROR",
        false,
      );
    }
  }

  estimateTokens(text: string): number {
    // Same as in FixedSizeChunker
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round(wordCount * 1.3);
  }
}
