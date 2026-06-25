// lib/factExtraction/shared/validators.ts

// Validation functions for the fact extraction process

/**
 * Validate that the input chunk is suitable for processing
 * @param chunk - The text chunk to validate
 * @throws ValidationError if chunk is invalid
 */
export function validateChunk(chunk: string): void {
  if (!chunk || typeof chunk !== 'string') {
    throw new Error('Chunk must be a non-empty string');
  }
  if (chunk.trim().length === 0) {
    throw new Error('Chunk cannot be empty or only whitespace');
  }
  // Optional: Check for minimum length to avoid processing trivial chunks
  if (chunk.trim().length < 10) {
    throw new Error('Chunk is too short to extract meaningful facts');
  }
}

/**
 * Validate the extraction configuration
 * @param config - The extraction configuration to validate
 * @throws ValidationError if configuration is invalid
 */
export function validateConfig(config: any): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
  }

  // Validate confidenceThreshold
  if (config.confidenceThreshold !== undefined) {
    if (typeof config.confidenceThreshold !== 'number' ||
        config.confidenceThreshold < 0 ||
        config.confidenceThreshold > 1) {
      throw new Error('Confidence threshold must be a number between 0 and 1');
    }
  }

  // Validate enableDeduplication
  if (config.enableDeduplication !== undefined &&
      typeof config.enableDeduplication !== 'boolean') {
    throw new Error('Enable deduplication must be a boolean');
  }

  // Validate language
  if (config.language !== undefined) {
    if (typeof config.language !== 'string' ||
        !/^[a-z]{2}(?:-[a-z]{2})?$/.test(config.language)) {
      throw new Error('Language must be a valid ISO 639-1 code (e.g., "en", "en-US")');
    }
  }

  // Validate maxRetries
  if (config.maxRetries !== undefined) {
    if (!Number.isInteger(config.maxRetries) ||
        config.maxRetries < 0) {
      throw new Error('Max retries must be a non-negative integer');
    }
  }

  // Validate timeoutMs
  if (config.timeoutMs !== undefined) {
    if (!Number.isInteger(config.timeoutMs) ||
        config.timeoutMs <= 0) {
      throw new Error('Timeout must be a positive integer');
    }
  }
}

/**
 * Validate that the extraction result has the expected structure
 * @param result - The result to validate
 * @throws ValidationError if result structure is invalid
 */
export function validateExtractionResult(result: any): void {
  if (!result || typeof result !== 'object') {
    throw new Error('Extraction result must be an object');
  }

  // Check that all expected arrays are present and are actually arrays
  const expectedArrays = [
    'facts', 'quotes', 'statistics', 'stories',
    'examples', 'lessons', 'insights', 'entities', 'dates'
  ];

  for (const key of expectedArrays) {
    if (result[key] === undefined) {
      // It's okay if some categories are missing - we'll treat as empty array
      continue;
    }
    if (!Array.isArray(result[key])) {
      throw new Error(`Extraction result.${key} must be an array`);
    }
  }

  // Validate success flag
  if (result.success !== undefined && typeof result.success !== 'boolean') {
    throw new Error('Success flag must be a boolean');
  }

  // If error is present, validate it
  if (result.error !== undefined) {
    if (typeof result.error !== 'object' || result.error === null) {
      throw new Error('Error must be an object if present');
    }
    if (result.error.message === undefined || typeof result.error.message !== 'string') {
      throw new Error('Error message must be a string');
    }
    // Optional: validate error code and recoverable flag
  }
}

/**
 * Validate an individual fact object
 * @param fact - The fact to validate
 * @throws ValidationError if fact is invalid
 */
export function validateFact(fact: any): void {
  if (!fact || typeof fact !== 'object') {
    throw new Error('Fact must be an object');
  }

  // Required fields
  const requiredFields = ['id', 'chunkId', 'evidenceText', 'sourceOffsets', 'confidence', 'factType', 'provider', 'model', 'promptVersion', 'createdAt'];
  for (const field of requiredFields) {
    if (fact[field] === undefined) {
      throw new Error(`Fact is missing required field: ${field}`);
    }
  }

  // Validate factType
  const validFactTypes = ['fact', 'quote', 'statistic', 'story', 'example', 'lesson', 'insight', 'entity', 'date'];
  if (!validFactTypes.includes(fact.factType)) {
    throw new Error(`Invalid factType: ${fact.factType}`);
  }

  // Validate provider
  const validProviders = ['gemini', 'openai', 'anthropic'];
  if (!validProviders.includes(fact.provider)) {
    throw new Error(`Invalid provider: ${fact.provider}`);
  }

  // Validate confidence
  if (typeof fact.confidence !== 'number' ||
      fact.confidence < 0 ||
      fact.confidence > 1) {
    throw new Error('Confidence must be a number between 0 and 1');
  }

  // Validate sourceOffsets
  if (!fact.sourceOffsets ||
      typeof fact.sourceOffsets !== 'object' ||
      typeof fact.sourceOffsets.start !== 'number' ||
      typeof fact.sourceOffsets.end !== 'number' ||
      fact.sourceOffsets.start < 0 ||
      fact.sourceOffsets.end < fact.sourceOffsets.start) {
    throw new Error('sourceOffsets must be an object with start and end numbers (start <= end)');
  }

  // Validate IDs are strings
  if (typeof fact.id !== 'string' ||
      typeof fact.chunkId !== 'string' ||
      typeof fact.evidenceText !== 'string' ||
      typeof fact.provider !== 'string' ||
      typeof fact.model !== 'string' ||
      typeof fact.promptVersion !== 'string' ||
      typeof fact.createdAt !== 'string') {
    throw new Error('String fields must be strings');
  }

  // Validate createdAt is ISO string
  const date = new Date(fact.createdAt);
  if (isNaN(date.getTime())) {
    throw new Error('createdAt must be a valid ISO date string');
  }
}

/**
 * Validate a quote object (extends fact validation)
 * @param quote - The quote to validate
 * @throws ValidationError if quote is invalid
 */
export function validateQuote(quote: any): void {
  validateFact(quote); // Validate base fact fields

  if (quote.factType !== 'quote') {
    throw new Error('Quote must have factType: quote');
  }

  // Validate speaker and context (can be null or string)
  if (quote.speaker !== null && typeof quote.speaker !== 'string') {
    throw new Error('Quote speaker must be a string or null');
  }
  if (quote.context !== null && typeof quote.context !== 'string') {
    throw new Error('Quote context must be a string or null');
  }
}

/**
 * Validate a statistic object
 * @param stat - The statistic to validate
 * @throws ValidationError if statistic is invalid
 */
export function validateStatistic(stat: any): void {
  validateFact(stat); // Validate base fact fields

  if (stat.factType !== 'statistic') {
    throw new Error('Statistic must have factType: statistic');
  }

  // Validate value (must be string)
  if (typeof stat.value !== 'string') {
    throw new Error('Statistic value must be a string');
  }

  // Validate unit (can be null or string)
  if (stat.unit !== null && typeof stat.unit !== 'string') {
    throw new Error('Statistic unit must be a string or null');
  }

  // Validate context (can be null or string)
  if (stat.context !== null && typeof stat.context !== 'string') {
    throw new Error('Statistic context must be a string or null');
  }
}

/**
 * Validate a story object
 * @param story - The story to validate
 * @throws ValidationError if story is invalid
 */
export function validateStory(story: any): void {
  validateFact(story); // Validate base fact fields

  if (story.factType !== 'story') {
    throw new Error('Story must have factType: story');
  }

  // Validate title (can be null or string)
  if (story.title !== null && typeof story.title !== 'string') {
    throw new Error('Story title must be a string or null');
  }

  // Validate characters (must be array of strings)
  if (!Array.isArray(story.characters)) {
    throw new Error('Story characters must be an array');
  }
  for (const char of story.characters) {
    if (typeof char !== 'string') {
      throw new Error('Each story character must be a string');
    }
  }

  // Validate setting (can be null or string)
  if (story.setting !== null && typeof story.setting !== 'string') {
    throw new Error('Story setting must be a string or null');
  }

  // Validate moral (can be null or string)
  if (story.moral !== null && typeof story.moral !== 'string') {
    throw new Error('Story moral must be a string or null');
  }
}

// Additional validation functions for other fact types would follow similar patterns
// For simplicity, we'll assume the base fact validation plus type-specific checks are sufficient
// for Example, Lesson, Insight, Entity, and Date in this skeleton implementation.

// Helper function to validate all facts in an extraction result
export function validateExtractionFacts(result: any): void {
  // Validate each fact category
  const factCategories = [
    { array: result.facts, type: 'fact' },
    { array: result.quotes, type: 'quote' },
    { array: result.statistics, type: 'statistic' },
    { array: result.stories, type: 'story' },
    { array: result.examples, type: 'example' },
    { array: result.lessons, type: 'lesson' },
    { array: result.insights, type: 'insight' },
    { array: result.entities, type: 'entity' },
    { array: result.dates, type: 'date' }
  ];

  for (const category of factCategories) {
    for (const item of category.array) {
      // Add factType field if missing (for simple fact types)
      if (!item.factType) {
        item.factType = category.type;
      }
      // Validate based on type
      switch (category.type) {
        case 'fact':
          validateFact(item);
          break;
        case 'quote':
          validateQuote(item);
          break;
        case 'statistic':
          validateStatistic(item);
          break;
        case 'story':
          validateStory(item);
          break;
        case 'example':
        case 'lesson':
        case 'insight':
          // These are simple extensions of Fact - validate base fact and factType
          validateFact(item);
          if (item.factType !== category.type) {
            throw new Error(`Item must have factType: ${category.type}`);
          }
          break;
        case 'entity':
          // Validate Entity
          validateFact(item);
          if (item.factType !== 'entity') {
            throw new Error('Entity must have factType: entity');
          }
          if (typeof item.entityType !== 'string' ||
              typeof item.entityValue !== 'string') {
            throw new Error('Entity must have entityType and entityValue strings');
          }
          break;
        case 'date':
          // Validate DateReference
          validateFact(item);
          if (item.factType !== 'date') {
            throw new Error('Date must have factType: date');
          }
          if (typeof item.dateValue !== 'string' ||
              typeof item.dateType !== 'string') {
            throw new Error('Date must have dateValue and dateType strings');
          }
          break;
      }
    }
  }
}