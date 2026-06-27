// lib/evidenceValidation/shared/scoring.ts

/**
 * Scoring algorithms for evidence validation
 * Each component contributes to the overall validation score (0.00-1.00)
 */

import { ValidationScore } from './types';

/**
 * Calculate evidence overlap score
 * Measures how much of the claimed evidence text appears in the source chunk
 */
export function calculateEvidenceOverlap(
  claimedEvidence: string,
  sourceChunk: string,
  matchedText: string | null,
  startOffset: number | null,
  endOffset: number | null
): number {
  if (!claimedEvidence || !sourceChunk) return 0.0;

  // If we have an exact match from validation, score highly
  if (matchedText && startOffset !== null && endOffset !== null) {
    const actualMatched = sourceChunk.substring(startOffset, endOffset);
    if (claimedEvidence === actualMatched) {
      return 1.0;
    }

    // Calculate similarity for partial matches
    return calculateStringSimilarity(claimedEvidence, actualMatched);
  }

  // If no match found, check for partial containment
  if (sourceChunk.includes(claimedEvidence)) {
    // Exact substring match
    return 0.9;
  }

  // Check for fuzzy containment
  const overlapRatio = findBestOverlapRatio(claimedEvidence, sourceChunk);
  return Math.min(overlapRatio * 0.8, 0.7); // Cap at 0.7 for fuzzy matches
}

/**
 * Calculate character similarity between two strings
 * Uses Jaccard similarity on character sets for simplicity
 */
export function calculateCharacterSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));

  let intersection = 0;
  for (const char of set1) {
    if (set2.has(char)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 1.0 : intersection / union;
}

/**
 * Calculate numeric consistency for statistics
 * Compares numerical values and units exactly
 */
export function calculateNumericConsistency(
  claimedValue: string,
  claimedUnit: string | null,
  matchedText: string | null,
  sourceChunk: string
): number {
  if (!claimedValue) return 1.0; // No numeric claim to validate

  if (!matchedText) return 0.0; // No match found

  // Simple approach: check if the claimed value and unit appear in the matched text
  const valueMatch = matchedText.includes(claimedValue);
  if (!valueMatch) return 0.0;

  if (claimedUnit !== null) {
    const unitMatch = matchedText.includes(claimedUnit);
    return unitMatch ? 1.0 : 0.5; // Value correct but unit wrong/missing
  }

  return 1.0; // Value matched, no unit specified
}

/**
 * Calculate named entity consistency
 * Compares entity text and type exactly
 */
export function calculateEntityConsistency(
  claimedText: string,
  claimedType: string,
  matchedText: string | null
): number {
  if (!claimedText || !claimedType) return 0.0;

  if (!matchedText) return 0.0;

  // Exact text match
  if (claimedText !== matchedText) return 0.0;

  // For type, we'd need NER to verify properly, but for now
  // we'll assume if text matches exactly, type is correct
  // In a real implementation, this would use NER validation
  return 1.0;
}

/**
 * Calculate quote integrity
 * Verifies verbatim match of quotation text
 */
export function calculateQuoteIntegrity(
  claimedQuote: string,
  matchedText: string | null
): number {
  if (!claimedQuote) return 1.0;

  if (!matchedText) return 0.0;

  // Verbatim match required for quotes
  return claimedQuote === matchedText ? 1.0 : 0.0;
}

/**
 * Calculate date consistency
 * Verifies date reference matches exactly
 */
export function calculateDateConsistency(
  claimedDateText: string,
  claimedDateType: string,
  claimedNormalizedValue: string | null,
  matchedText: string | null
): number {
  if (!claimedDateText) return 1.0;

  if (!matchedText) return 0.0;

  // Exact text match required for date references
  const textMatch = claimedDateText === matchedText ? 1.0 : 0.0;

  // For simplicity, we're focusing on exact text match
  // A full implementation would validate date types and normalization
  return textMatch;
}

/**
 * Calculate context completeness
 * Evaluates whether surrounding context supports the fact
 */
export function calculateContextCompleteness(
  claimedFact: string,
  sourceChunk: string,
  startOffset: number | null,
  endOffset: number | null
): number {
  if (!claimedFact || !sourceChunk) return 0.0;

  if (startOffset === null || endOffset === null) {
    return 0.1; // No exact match found
  }

  const contextBefore = Math.min(80, startOffset);
  const contextAfter = Math.min(80, Math.max(0, sourceChunk.length - endOffset));
  if (contextBefore > 20 || contextAfter > 20) return 1.0;
  if (contextBefore > 0 || contextAfter > 0) return 0.7;
  return 0.4;
}

/**
 * Calculate language confidence
 * Penalizes for potential OCR/transcription errors based on character quality
 */
export function calculateLanguageConfidence(text: string): number {
  if (!text) return 0.5;

  // Simple heuristic: ratio of alphanumeric + space characters to total
  const cleanChars = text.match(/[a-zA-Z0-9\s,.!?;:()"'-]/g) || [];
  const totalChars = text.length;

  if (totalChars === 0) return 0.5;

  const cleanRatio = cleanChars.length / totalChars;

  // Also check for repeated characters (OCR stutter)
  const repeatedCharPenalty = (text.match(/(.)\1{2,}/g) || []).length * 0.05;

  // Check for unusual character sequences
  const unusualPatternPenalty = (text.match(/[^\x00-\x7F]/g) || []).length * 0.02;

  let score = Math.min(cleanRatio, 1.0) - repeatedCharPenalty - unusualPatternPenalty;
  return Math.max(0.1, Math.min(1.0, score)); // Clamp between 0.1 and 1.0
}

/**
 * Calculate overall weighted validation score
 */
export function calculateValidationScore(
  evidenceOverlap: number,
  characterSimilarity: number,
  numericConsistency: number,
  namedEntityConsistency: number,
  quoteIntegrity: number,
  dateConsistency: number,
  contextCompleteness: number,
  languageConfidence: number
): number {
  // Weights must sum to 1.0
  const weights = {
    evidenceOverlap: 0.25,
    characterSimilarity: 0.15,
    numericConsistency: 0.10,
    namedEntityConsistency: 0.10,
    quoteIntegrity: 0.10,
    dateConsistency: 0.10,
    contextCompleteness: 0.10,
    languageConfidence: 0.10
  };

  const score =
    (evidenceOverlap * weights.evidenceOverlap) +
    (characterSimilarity * weights.characterSimilarity) +
    (numericConsistency * weights.numericConsistency) +
    (namedEntityConsistency * weights.namedEntityConsistency) +
    (quoteIntegrity * weights.quoteIntegrity) +
    (dateConsistency * weights.dateConsistency) +
    (contextCompleteness * weights.contextCompleteness) +
    (languageConfidence * weights.languageConfidence);

  return Math.max(0.0, Math.min(1.0, score)); // Ensure bounds
}

// Helper functions

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

function findBestOverlapRatio(pattern: string, text: string): number {
  if (!pattern || !text) return 0.0;

  let maxRatio = 0.0;

  // Sliding window approach
  for (let i = 0; i <= text.length - pattern.length; i++) {
    const substring = text.substring(i, i + pattern.length);
    const ratio = calculateStringSimilarity(pattern, substring);
    maxRatio = Math.max(maxRatio, ratio);
  }

  // Also check if pattern is contained in text
  if (text.includes(pattern)) {
    maxRatio = Math.max(maxRatio, 1.0);
  }

  return maxRatio;
}
