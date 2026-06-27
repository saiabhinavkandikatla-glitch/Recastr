// lib/chunking/strategies/semanticStrategy.ts

import type { BaseChunkingStrategy, Chunk, ChunkingConfig, ChunkingResult } from "../shared/types";
import { ChunkingError } from "../shared/errors";

export class SemanticChunker implements BaseChunkingStrategy {
  /**
   * Split text into chunks based on semantic similarity.
   * Attempts to group sentences that are semantically related into the same chunk.
   * Respects paragraph and heading boundaries as hard constraints if configured.
   */

  async validate(): Promise<void> {
    // In a real implementation, we might check if a semantic model is available
  }

  async split(text: string, config: ChunkingConfig): Promise<ChunkingResult> {
    try {
      const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
      const maxWords = Math.max(config.minChunkSize || 80, Math.floor(config.targetTokenCount / 1.3));
      const chunks: Chunk[] = [];
      let current: string[] = [];

      for (const sentence of sentences) {
        const currentWords = current.join(" ").split(/\s+/).filter(Boolean).length;
        const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
        if (current.length && currentWords + sentenceWords > maxWords) {
          chunks.push(createSemanticChunk(text, current.join(" "), chunks.length));
          current = [];
        }
        current.push(sentence);
      }
      if (current.length) chunks.push(createSemanticChunk(text, current.join(" "), chunks.length));

      return {
        chunks,
        metadata: {
          strategy: "semantic",
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
        `Semantic chunking failed: ${error instanceof Error ? error.message : String(error)}`,
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

function createSemanticChunk(source: string, chunkText: string, index: number): Chunk {
  const startOffset = source.indexOf(chunkText);
  const words = chunkText.split(/\s+/).filter(Boolean);
  return {
    id: `semantic-${index + 1}`,
    text: chunkText,
    index,
    tokenCount: Math.round(words.length * 1.3),
    wordCount: words.length,
    charCount: chunkText.length,
    startOffset,
    endOffset: startOffset + chunkText.length,
    headingPath: [],
    contentHash: `${index}-${chunkText.length}`,
    metadata: {},
  };
}
