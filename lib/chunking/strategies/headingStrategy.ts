// lib/chunking/strategies/headingStrategy.ts

import type { BaseChunkingStrategy, Chunk, ChunkingConfig, ChunkingResult } from "../shared/types";
import { ChunkingError } from "../shared/errors";

export class HeadingChunker implements BaseChunkingStrategy {
  /**
   * Split text into chunks based on heading hierarchy.
   * Attempts to create chunks that are sections under a common heading.
   * Respects heading levels and tries to keep sections intact.
   */

  async validate(): Promise<void> {
    // No specific validation needed
  }

  async split(text: string, config: ChunkingConfig): Promise<ChunkingResult> {
    try {
      const sections = text
        .split(/(?=^#{1,6}\s+)/m)
        .map((section) => section.trim())
        .filter(Boolean);
      const sourceSections = sections.length ? sections : [text.trim()].filter(Boolean);
      const chunks: Chunk[] = sourceSections.map((section, index) => {
        const heading = section.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim();
        const startOffset = text.indexOf(section);
        const words = section.split(/\s+/).filter(Boolean);
        return {
          id: `heading-${index + 1}`,
          text: section,
          index,
          tokenCount: Math.round(words.length * 1.3),
          wordCount: words.length,
          charCount: section.length,
          startOffset,
          endOffset: startOffset + section.length,
          headingPath: heading ? [heading] : [],
          contentHash: `${index}-${section.length}`,
          metadata: {},
        };
      });

      return {
        chunks,
        metadata: {
          strategy: "heading",
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
        `Heading chunking failed: ${error instanceof Error ? error.message : String(error)}`,
        "CHUNKING_ERROR",
        false,
      );
    }
  }

  estimateTokens(text: string): number {
    // Same as before
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round(wordCount * 1.3);
  }
}
