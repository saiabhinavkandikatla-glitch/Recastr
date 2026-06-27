// lib/chunking/chunker.ts

import { BaseChunkingStrategy } from './shared/types';
import { ChunkingResult, ChunkingConfig } from './shared/types';
import {
  ValidationError,
  ConfigurationError,
  StrategyError,
} from './shared/errors';
import {
  FixedSizeChunker,
} from './strategies/fixedSizeStrategy';
import {
  ParagraphChunker,
} from './strategies/paragraphStrategy';
import {
  HeadingChunker,
} from './strategies/headingStrategy';
import {
  SemanticChunker,
} from './strategies/semanticStrategy';

/**
 * Main chunker class that manages different chunking strategies.
 * Provides a unified interface for chunking text.
 */
export class Chunker {
  private strategies: Map<string, BaseChunkingStrategy>;

  constructor() {
    this.strategies = new Map();
    // Register default strategies
    this.registerStrategy('fixedSize', new FixedSizeChunker());
    this.registerStrategy('paragraph', new ParagraphChunker());
    this.registerStrategy('heading', new HeadingChunker());
    this.registerStrategy('semantic', new SemanticChunker());
  }

  /**
   * Register a chunking strategy with a name.
   * @param name - The name to register the strategy under
   * @param strategy - The strategy instance
   */
  public registerStrategy(name: string, strategy: BaseChunkingStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Get a registered strategy by name.
   * @param name - The name of the strategy
   * @returns The strategy instance, or undefined if not found
   */
  public getStrategy(name: string): BaseChunkingStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * List all registered strategy names.
   * @returns Array of strategy names
   */
  public listStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Validate a chunking configuration.
   * @param config - The configuration to validate
   * @throws ValidationError or ConfigurationError if the configuration is invalid
   */
  public async validateConfig(config: ChunkingConfig): Promise<void> {
    // Basic validation
    if (config.targetTokenCount <= 0) {
      throw new ValidationError('Target token count must be positive');
    }
    if (config.overlapTokenCount < 0) {
      throw new ValidationError('Overlap token count cannot be negative');
    }
    if (config.overlapTokenCount > config.targetTokenCount) {
      throw new ValidationError('Overlap token count cannot exceed target token count');
    }
    if (config.minChunkSize > 0 && config.minChunkSize > config.targetTokenCount) {
      throw new ValidationError('Min chunk size cannot be greater than target token count');
    }
    if (config.maxChunkSize > 0 && config.maxChunkSize < config.targetTokenCount) {
      throw new ValidationError('Max chunk size cannot be less than target token count');
    }
    if (config.minChunkSize > 0 && config.maxChunkSize > 0 && config.minChunkSize > config.maxChunkSize) {
      throw new ValidationError('Min chunk size cannot be greater than max chunk size');
    }
  }

  /**
   * Chunk the given text using the specified strategy (or the default strategy if not specified).
   * @param text - The text to chunk
   * @param config - The chunking configuration
   * @param strategyName - Optional name of the strategy to use. If not provided, the first registered strategy is used.
   * @returns A promise that resolves to the chunking result
   */
  public async chunkText(
    text: string,
    config: ChunkingConfig,
    strategyName?: string
  ): Promise<ChunkingResult> {
    // Validate input
    if (!text || text.trim() === '') {
      return {
        chunks: [],
        metadata: {
          strategy: strategyName || 'unknown',
          config,
          totalChunks: 0,
          processingTimeMs: 0,
          sourceTextLength: 0,
        },
        success: false,
        error: new ValidationError(
          'Input text is empty',
          false
        ),
      };
    }

    // Validate configuration
    try {
      await this.validateConfig(config);
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          chunks: [],
          metadata: {
            strategy: strategyName || 'unknown',
            config,
            totalChunks: 0,
            processingTimeMs: 0,
            sourceTextLength: text.length,
          },
          success: false,
          error: error,
        };
      }
      // If it's a ConfigurationError, we still treat it as a validation error for the purpose of returning a failed result
      return {
        chunks: [],
        metadata: {
          strategy: strategyName || 'unknown',
          config,
          totalChunks: 0,
          processingTimeMs: 0,
          sourceTextLength: text.length,
        },
        success: false,
        error: new ValidationError(
          error instanceof Error ? error.message : String(error),
          false
        ),
      };
    }

    // Determine which strategy to use
    const strategy = strategyName
      ? this.getStrategy(strategyName)
      : this.strategies.values().next().value; // Get the first strategy

    if (!strategy) {
      return {
        chunks: [],
        metadata: {
          strategy: strategyName || 'unknown',
          config,
          totalChunks: 0,
          processingTimeMs: 0,
          sourceTextLength: text.length,
        },
        success: false,
        error: new ValidationError(
          `Strategy not found: ${strategyName || 'undefined'}`,
          false
        ),
      };
    }

    // Validate the strategy
    try {
      await strategy.validate();
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          chunks: [],
          metadata: {
            strategy: strategyName || 'unknown',
            config,
            totalChunks: 0,
            processingTimeMs: 0,
            sourceTextLength: text.length,
          },
          success: false,
          error: error,
        };
      }
      // If it's a different error, we treat it as a validation error for the purpose of returning a failed result
      return {
        chunks: [],
        metadata: {
          strategy: strategyName || 'unknown',
          config,
          totalChunks: 0,
          processingTimeMs: 0,
          sourceTextLength: text.length,
        },
        success: false,
        error: new ValidationError(
          error instanceof Error ? error.message : String(error),
          false
        ),
      };
    }

    // Perform chunking
    const startTime = Date.now();
    let result: ChunkingResult;

    try {
      result = await strategy.split(text, config);
    } catch (error) {
      if (error instanceof StrategyError) {
        return {
          chunks: [],
          metadata: {
            strategy: strategyName || 'unknown',
            config,
            totalChunks: 0,
            processingTimeMs: Date.now() - startTime,
            sourceTextLength: text.length,
          },
          success: false,
          error,
        };
      }
      // For any other error, we wrap it in a StrategyError
      return {
        chunks: [],
        metadata: {
          strategy: strategyName || 'unknown',
          config,
          totalChunks: 0,
          processingTimeMs: Date.now() - startTime,
          sourceTextLength: text.length,
        },
        success: false,
        error: new StrategyError(
          error instanceof Error ? error.message : String(error),
          false
        ),
      };
    }

    // Ensure the result has the correct metadata
    if (result.success) {
      result.metadata = {
        ...result.metadata,
        strategy: strategyName || 'unknown',
        processingTimeMs: Date.now() - startTime,
        sourceTextLength: text.length,
      };
    }

    return result;
  }
}
