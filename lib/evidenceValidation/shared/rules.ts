// lib/evidenceValidation/shared/rules.ts

/**
 * Validation rules engine for evidence validation
 * Implements specific validation rules that must be satisfied for a fact to be considered valid
 */

import type { ValidationRule } from "./types";

/**
 * Rule: Exact evidence must exist in the source chunk
 */
export const ExactEvidenceRule: ValidationRule = {
  id: 'exact-evidence',
  description: 'The exact evidence text must be present in the source chunk',
  validate: (fact: any, chunk: string, matchData: any) => {
    const match = matchData;
    if (!match || !match.matchedText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'No matching evidence found in source chunk'
      };
    }

    const { claimedEvidence, matchedText, startOffset, endOffset } = matchData;
    const actualMatched = chunk.substring(startOffset, endOffset);

    if (claimedEvidence === actualMatched) {
      return {
        passed: true,
        score: 1.0,
        reason: 'Exact evidence match found'
      };
    }

    // Calculate similarity for partial matches
    const similarity = calculateStringSimilarity(claimedEvidence, actualMatched);
    return {
      passed: similarity >= 0.95, // Very high threshold for exact evidence
      score: similarity,
      reason: `Evidence partially matches (similarity: ${similarity.toFixed(2)})`
    };
  }
};

/**
 * Rule: Quote text must be verbatim
 */
export const QuoteVerbatimRule: ValidationRule = {
  id: 'quote-verbatim',
  description: 'Quoted text must match exactly (verbatim)',
  validate: (fact: any, chunk: string, matchData: any) => {
    const match = matchData;
    if (fact.factType !== 'quote') {
      return {
        passed: true,
        score: 1.0,
        reason: 'Not a quote fact, rule not applicable'
      };
    }

    const quote = fact as any; // Assuming Quote interface
    if (!quote.evidenceText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Quote missing evidence text'
      };
    }

    if (!match || !match.matchedText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'No matching quote text found in source'
      };
    }

    // Verbatim match required
    const isVerbatim = quote.evidenceText === match.matchedText;
    return {
      passed: isVerbatim,
      score: isVerbatim ? 1.0 : 0.0,
      reason: isVerbatim
        ? 'Quote matches verbatim'
        : `Quote mismatch: expected "${quote.evidenceText}", found "${match.matchedText}"`
    };
  }
};

/**
 * Rule: Statistical values must match exactly
 */
export const NumericExactMatchRule: ValidationRule = {
  id: 'numeric-exact',
  description: 'Statistical values and units must match exactly',
  validate: (fact: any, chunk: string, matchData: any) => {
    const match = matchData;
    if (fact.factType !== 'statistic') {
      return {
        passed: true,
        score: 1.0,
        reason: 'Not a statistic fact, rule not applicable'
      };
    }

    const stat = fact as any; // Assuming Statistic interface
    if (!stat.value) {
      return {
        passed: true,
        score: 1.0,
        reason: 'No numeric value to validate'
      };
    }

    if (!match || !match.matchedText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'No matching statistic found in source'
      };
    }

    const matchedText = match.matchedText;
    const valueMatch = matchedText.includes(stat.value);

    if (!valueMatch) {
      return {
        passed: false,
        score: 0.0,
        reason: `Numeric value "${stat.value}" not found in matched text`
      };
    }

    // Check unit if present
    if (stat.unit !== null) {
      const unitMatch = matchedText.includes(stat.unit);
      if (!unitMatch) {
        return {
          passed: false,
          score: 0.5, // Value correct but unit wrong/missing
          reason: `Value matches but unit "${stat.unit}" not found in matched text`
        };
      }
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Numeric value and unit match exactly'
    };
  }
};

/**
 * Rule: Date references must match exactly
 */
export const DateExactMatchRule: ValidationRule = {
  id: 'date-exact',
  description: 'Date references must match exactly',
  validate: (fact: any, chunk: string, matchData: any) => {
    const match = matchData;
    if (fact.factType !== 'date') {
      return {
        passed: true,
        score: 1.0,
        reason: 'Not a date fact, rule not applicable'
      };
    }

    const dateFact = fact as any; // Assuming DateReference interface
    if (!dateFact.dateValue) {
      return {
        passed: true,
        score: 1.0,
        reason: 'No date value to validate'
      };
    }

    if (!match || !match.matchedText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'No matching date reference found in source'
      };
    }

    const matchedText = match.matchedText;
    const dateTextMatch = matchedText.includes(dateFact.dateValue);

    if (!dateTextMatch) {
      return {
        passed: false,
        score: 0.0,
        reason: `Date "${dateFact.dateValue}" not found in matched text`
      };
    }

    // Additional validation for date type could go here
    return {
      passed: true,
      score: 1.0,
      reason: 'Date reference matches exactly'
    };
  }
};

/**
 * Rule: Entity text must match exactly
 */
export const EntityExactMatchRule: ValidationRule = {
  id: 'entity-exact',
  description: 'Named entity text must match exactly',
  validate: (fact: any, chunk: string, matchData: any) => {
    const match = matchData;
    if (fact.factType !== 'entity') {
      return {
        passed: true,
        score: 1.0,
        reason: 'Not an entity fact, rule not applicable'
      };
    }

    const entity = fact as any; // Assuming Entity interface
    if (!entity.entityValue) {
      return {
        passed: true,
        score: 1.0,
        reason: 'No entity value to validate'
      };
    }

    if (!match || !match.matchedText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'No matching entity found in source'
      };
    }

    const matchedText = match.matchedText;
    const exactMatch = entity.entityValue === matchedText;

    return {
      passed: exactMatch,
      score: exactMatch ? 1.0 : 0.0,
      reason: exactMatch
        ? 'Entity matches exactly'
        : `Entity mismatch: expected "${entity.entityValue}", found "${matchedText}"`
    };
  }
};

/**
 * Rule: Speaker attribution must match for quotes
 */
export const SpeakerAttributionRule: ValidationRule = {
  id: 'speaker-attribution',
  description: 'Speaker attribution must match source if specified',
  validate: (fact: any, chunk: string, matchData: any) => {
    if (fact.factType !== 'quote') {
      return {
        passed: true,
        score: 1.0,
        reason: 'Not a quote fact, rule not applicable'
      };
    }

    const quote = fact as any; // Assuming Quote interface
    // Speaker can be null/undefined, which is valid
    // In a real implementation, we would extract speaker from context
    // For now, we'll focus on the quote text itself

    return {
      passed: true,
      score: 1.0,
      reason: 'Speaker attribution validation not implemented in this version'
    };
  }
};

/**
 * Rule: No fabrication - facts must not be invented
 * This is implicitly handled by requiring evidence match
 */
export const NoFabricationRule: ValidationRule = {
  id: 'no-fabrication',
  description: 'Facts must not be fabricated - must have evidence support',
  validate: (fact: any, chunk: string, matchData: any) => {
    const match = matchData;
    if (!match || !match.matchedText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Fact appears to be fabricated - no supporting evidence found'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Fact has supporting evidence in source'
    };
  }
};

/**
 * Rule: Context appropriateness
 * Ensures the fact is presented in appropriate context
 */
export const ContextAppropriatenessRule: ValidationRule = {
  id: 'context-appropriateness',
  description: 'Fact must be appropriately contextualized in source',
  validate: (fact: any, chunk: string, matchData: any) => {
    const match = matchData;
    if (!match || !match.matchedText) {
      return {
        passed: false,
        score: 0.0,
        reason: 'No context available for validation'
      };
    }

    // Basic check: ensure we have some surrounding context
    const matchStart = match.startOffset ?? 0;
    const matchEnd = match.endOffset ?? 0;
    const contextBefore = Math.min(50, matchStart);
    const contextAfter = Math.min(50, chunk.length - matchEnd);

    const hasSomeContext = (contextBefore > 10 || contextAfter > 10);

    return {
      passed: hasSomeContext,
      score: hasSomeContext ? 1.0 : 0.5,
      reason: hasSomeContext
        ? 'Adequate context available'
        : 'Limited context around matched text'
    };
  }
};

// Helper function (same as in scoring.ts for consistency)
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  // Simple Levenshtein-based similarity for short strings
  if (str1.length < 10 && str2.length < 10) {
    return levenshteinSimilarity(str1, str2);
  }

  // For longer strings, use Jaccard on word boundaries
  return jaccardSimilarity(str1, str2);
}

function levenshteinSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
  if (len2 === 0) return 0.0;

  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
}

function jaccardSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }

  const union = words1.size + words2.size - intersection;
  return union === 0 ? 1.0 : intersection / union;
}

/**
 * Get all validation rules
 */
export const ValidationRules: ValidationRule[] = [
  ExactEvidenceRule,
  QuoteVerbatimRule,
  NumericExactMatchRule,
  DateExactMatchRule,
  EntityExactMatchRule,
  SpeakerAttributionRule,
  NoFabricationRule,
  ContextAppropriatenessRule
];

/**
 * Apply all relevant rules to a fact
 */
export function applyValidationRules(
  fact: any,
  chunk: string,
  matchData: any
): {
  passed: boolean;
  score: number;
  reasons: string[];
  failedRules: string[];
} {
  const applicableRules = ValidationRules.filter(rule => {
    // Skip rules that are not applicable based on fact type
    switch (rule.id) {
      case 'quote-verbatim':
        return fact.factType === 'quote';
      case 'numeric-exact':
        return fact.factType === 'statistic';
      case 'date-exact':
        return fact.factType === 'date';
      case 'entity-exact':
        return fact.factType === 'entity';
      case 'speaker-attribution':
        return fact.factType === 'quote';
      default:
        return true; // General rules apply to all
    }
  });

  let totalScore = 0.0;
  let passedCount = 0;
  const reasons: string[] = [];
  const failedRules: string[] = [];

  for (const rule of applicableRules) {
    const result = rule.validate(fact, chunk, matchData);
    totalScore += result.score;
    if (result.passed) {
      passedCount++;
    } else {
      failedRules.push(rule.id);
    }
    reasons.push(`[${rule.id}] ${result.reason}`);
  }

  const averageScore = applicableRules.length > 0 ? totalScore / applicableRules.length : 0.0;
  const passed = passedCount === applicableRules.length; // All must pass

  return {
    passed,
    score: averageScore,
    reasons,
    failedRules
  };
}
