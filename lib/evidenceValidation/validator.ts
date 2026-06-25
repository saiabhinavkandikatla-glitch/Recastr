// lib/evidenceValidation/validator.ts
import { EvidenceValidatorProvider } from './providers';
import { ValidationResult, ValidationConfig } from './shared/types';
import { validateChunk, validateConfig } from './shared/validators';
import { normalizeWhitespace, normalizeQuotes, removeBoilerplate, normalizeUnicode } from './shared/normalizers';

/**
 * Main Evidence Validator class that orchestrates the validation process
 */
export class EvidenceValidator {
  private provider: EvidenceValidatorProvider;

  constructor(provider: EvidenceValidatorProvider) {
    this.provider = provider;
  }

  /**
   * Validate an extracted fact against its source chunk
   * @param fact - The extracted fact to validate
   * @param chunk - The source chunk of text
   * @param config - Validation configuration
   * @returns Validation result
   */
  async validate(fact: any, chunk: string, config: ValidationConfig = {}): Promise<ValidationResult> {
    try {
      // Step 1: Validate input
      this.validateInput(fact, chunk);

      // Step 2: Validate configuration (use defaults where missing)
      const validatedConfig: ValidationConfig = {
        validationThreshold: config.validationThreshold ?? 0.95,
        reviewThresholdLow: config.reviewThresholdLow ?? 0.80,
        reviewThresholdHigh: config.reviewThresholdHigh ?? 0.94,
        enableRuleEngine: config.enableRuleEngine ?? true,
        enableLLMValidation: config.enableLLMValidation ?? true,
        maxRetries: config.maxRetries ?? 3,
        timeoutMs: config.timeoutMs ?? 30000,
        ...config
      };
      validateConfig(validatedConfig);

      // Step 3: Normalize the chunk (optional preprocessing)
      const normalizedChunk = this.normalizeChunk(chunk);

      // Step 4: Validate using the provider with retry logic
      let result: ValidationResult;
      let lastError: any;

      for (let attempt = 0; attempt <= validatedConfig.maxRetries; attempt++) {
        try {
          result = await this.provider.validate(fact, normalizedChunk, validatedConfig);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          if (attempt === validatedConfig.maxRetries) {
            throw error; // Last attempt failed, propagate error
          }
          // Wait before retry (exponential backoff with jitter)
          await this.delay(Math.pow(2, attempt) * 100 + Math.random() * 100);
        }
      }

      // Step 5: Validate the provider's result structure
      this.validateValidationResult(result);

      // Step 6: Post-process the result (normalize evidence, apply rules, etc.)
      const processedResult = await this.postProcessResult(
        result,
        normalizedChunk,
        validatedConfig
      );

      // Step 7: Validate the processed result
      this.validateValidationResult(processedResult);

      return processedResult;
    } catch (error) {
      // Return error in the result format
      if (error instanceof Error) {
        return {
          factId: fact.id || 'unknown',
          chunkId: fact.chunkId || 'unknown',
          evidenceText: fact.evidenceText || '',
          matchedText: null,
          startOffset: null,
          endOffset: null,
          supported: false,
          validationScore: 0.0,
          validationReason: `Validation failed: ${error.message}`,
          validatorProvider: this.getProviderName(),
          validatorModel: 'unknown',
          validatorPromptVersion: '1.0.0',
          validatorVersion: '1.0.0',
          createdAt: new Date().toISOString()
        };
      }
      throw error;
    }
  }

  /**
   * Validate input fact and chunk
   */
  private validateInput(fact: any, chunk: string): void {
    if (!chunk || typeof chunk !== 'string') {
      throw new Error('Chunk must be a non-empty string');
    }
    if (chunk.trim().length === 0) {
      throw new Error('Chunk cannot be empty or only whitespace');
    }
    if (chunk.trim().length < 10) {
      throw new Error('Chunk is too short to validate meaningful facts');
    }

    // Basic fact validation
    if (!fact || typeof fact !== 'object') {
      throw new Error('Fact must be an object');
    }
    if (!fact.id || typeof fact.id !== 'string') {
      throw new Error('Fact must have a string id');
    }
    if (!fact.chunkId || typeof fact.chunkId !== 'string') {
      throw new Error('Fact must have a string chunkId');
    }
    if (!fact.evidenceText || typeof fact.evidenceText !== 'string') {
      throw new Error('Fact must have string evidenceText');
    }
  }

  /**
   * Validate configuration
   * Delegates to shared validator
   */
  private validateConfig(config: ValidationConfig): void {
    validateConfig(config as any); // Reuse shared validator with type assertion
  }

  /**
   * Normalize the input chunk before validation
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
   * Validate that the validation result has the expected structure
   */
  private validateValidationResult(result: any): void {
    if (!result || typeof result !== 'object') {
      throw new Error('Validation result must be an object');
    }

    // Check required fields
    const requiredFields = [
      'factId', 'chunkId', 'evidenceText', 'supported', 'validationScore',
      'validationReason', 'validatorProvider', 'validatorModel',
      'validatorPromptVersion', 'validatorVersion', 'createdAt'
    ];

    for (const field of requiredFields) {
      if (result[field] === undefined) {
        throw new Error(`Validation result is missing required field: ${field}`);
      }
    }

    // Validate specific field types
    if (typeof result.factId !== 'string') {
      throw new Error('factId must be a string');
    }
    if (typeof result.chunkId !== 'string') {
      throw new Error('chunkId must be a string');
    }
    if (typeof result.evidenceText !== 'string') {
      throw new Error('evidenceText must be a string');
    }
    if (typeof result.supported !== 'boolean') {
      throw new Error('supported must be a boolean');
    }
    if (typeof result.validationScore !== 'number' ||
        result.validationScore < 0 ||
        result.validationScore > 1) {
      throw new Error('validationScore must be a number between 0 and 1');
    }
    if (typeof result.validationReason !== 'string') {
      throw new Error('validationReason must be a string');
    }
    const validProviders = ['gemini', 'openai', 'anthropic'];
    if (!validProviders.includes(result.validatorProvider)) {
      throw new Error('validatorProvider must be one of: gemini, openai, anthropic');
    }
    if (typeof result.validatorModel !== 'string') {
      throw new Error('validatorModel must be a string');
    }
    if (typeof result.validatorPromptVersion !== 'string') {
      throw new Error('validatorPromptVersion must be a string');
    }
    if (typeof result.validatorVersion !== 'string') {
      throw new Error('validatorVersion must be a string');
    }
    if (typeof result.createdAt !== 'string') {
      throw new Error('createdAt must be a string');
    }
    // Validate date format
    const date = new Date(result.createdAt);
    if (isNaN(date.getTime())) {
      throw new Error('createdAt must be a valid ISO date string');
    }

    // Optional fields validation
    if (result.matchedText !== null && typeof result.matchedText !== 'string') {
      throw new Error('matchedText must be a string or null');
    }
    if (result.startOffset !== null && typeof result.startOffset !== 'number') {
      throw new Error('startOffset must be a number or null');
    }
    if (result.endOffset !== null && typeof result.endOffset !== 'number') {
      throw new Error('endOffset must be a number or null');
    }
  }

  /**
   * Post-process the validation result: apply normalization, rule engine, etc.
   */
  private async postProcessResult(
    result: ValidationResult,
    normalizedChunk: string,
    config: ValidationConfig
  ): Promise<ValidationResult> {
    // Create a copy to avoid mutating the original
    const processedResult = { ...result };

    // Normalize evidence text
    if (processedResult.evidenceText) {
      processedResult.evidenceText = normalizeWhitespace(
        normalizeQuotes(
          removeBoilerplate(
            normalizeUnicode(processedResult.evidenceText)
          )
        )
      );
    }

    // Normalize matched text if present
    if (processedResult.matchedText !== null) {
      processedResult.matchedText = normalizeWhitespace(
        normalizeQuotes(
          removeBoilerplate(
            normalizeUnicode(processedResult.matchedText)
          )
        )
      );
    }

    // Recalculate offsets if we have matched text
    if (processedResult.matchedText !== null &&
        processedResult.startOffset === null &&
        processedResult.endOffset === null) {
      const index = normalizedChunk.indexOf(processedResult.matchedText);
      if (index !== -1) {
        processedResult.startOffset = index;
        processedResult.endOffset = index + processedResult.matchedText.length;
      }
    }

    // Apply rule engine if enabled
    if (config.enableRuleEngine) {
      // Note: In a full implementation, we would apply the rule engine here
      // For this skeleton, we'll skip detailed rule application
      // The rule engine would adjust the validationScore based on specific rules
    }

    // Ensure validation score is within bounds
    processedResult.validationScore = Math.max(0.0, Math.min(1.0, processedResult.validationScore));

    // Update supported status based on threshold if not already set by provider
    // (assuming provider didn't set it based on threshold)
    if (processedResult.validationScore >= config.validationThreshold) {
      processedResult.supported = true;
    } else if (processedResult.validationScore < config.reviewThresholdLow) {
      processedResult.supported = false;
    } // else remains as set by provider (would be in review range)

    // Update validation reason to reflect any changes
    if (processedResult.validationScore >= config.validationThreshold) {
      processedResult.validationReason += ' (Validated based on score threshold)';
    } else if (processedResult.validationScore < config.reviewThresholdLow) {
      processedResult.validationReason += ' (Rejected based on score threshold)';
    } else {
      processedResult.validationReason += ' (Needs review based on score range)';
    }

    return processedResult;
  }

  /**
   * Get provider name for error reporting
   */
  private getProviderName(): string {
    // This would ideally come from the provider instance
    // For now, we'll return a generic name
    return 'unknown';
  }
}