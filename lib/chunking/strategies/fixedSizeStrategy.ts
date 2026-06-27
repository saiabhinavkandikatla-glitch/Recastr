// lib/chunking/strategies/fixedSizeStrategy.ts

import type { BaseChunkingStrategy, Chunk, ChunkingConfig, ChunkingResult } from "../shared/types";
import { ChunkingError } from "../shared/errors";

export class FixedSizeChunker implements BaseChunkingStrategy {
  /**
   * Split text into chunks of approximately equal size (by tokens).
   * This strategy does not necessarily respect sentence or paragraph boundaries.
   */

  async validate(): Promise<void> {
    // Validate any strategy-specific prerequisites
    // For now, no specific validation needed
  }

  async split(text: string, config: ChunkingConfig): Promise<ChunkingResult> {
    try {
      const chunks = splitByWords(text, config);
      return {
        chunks,
        metadata: {
          strategy: "fixedSize",
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
        `Fixed size chunking failed: ${error instanceof Error ? error.message : String(error)}`,
        "CHUNKING_ERROR",
        false,
      );
    }
  }

  estimateTokens(text: string): number {
    // Simple estimation: split by whitespace and multiply by 1.3 (average tokens per word)
    // In a real implementation, use a proper tokenizer (e.g., tiktoken for GPT, or sentence-piece)
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round(wordCount * 1.3);
  }
}

function splitByWords(text: string, config: ChunkingConfig): Chunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const targetWords = Math.max(config.minChunkSize || 50, Math.floor(config.targetTokenCount / 1.3));
  const overlapWords = Math.max(0, Math.floor(config.overlapTokenCount / 1.3));
  const step = Math.max(1, targetWords - overlapWords);
  const chunks: Chunk[] = [];
  let charCursor = 0;

  for (let startWord = 0; startWord < words.length; startWord += step) {
    const chunkWords = words.slice(startWord, startWord + targetWords);
    if (chunkWords.length === 0) break;
    const chunkText = chunkWords.join(" ");
    const startOffset = text.indexOf(chunkWords[0], charCursor);
    const endOffset = startOffset + chunkText.length;
    charCursor = Math.max(endOffset, charCursor);
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      text: chunkText,
      index: chunks.length,
      tokenCount: Math.round(chunkWords.length * 1.3),
      wordCount: chunkWords.length,
      charCount: chunkText.length,
      startOffset: Math.max(0, startOffset),
      endOffset: Math.max(0, endOffset),
      headingPath: [],
      contentHash: `${startWord}-${chunkText.length}`,
      metadata: {},
    });
    if (startWord + targetWords >= words.length) break;
  }

  return chunks;
}
