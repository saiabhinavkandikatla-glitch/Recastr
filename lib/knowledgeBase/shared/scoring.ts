// lib/knowledgeBase/shared/scoring.ts

/**
 * Scoring algorithms for knowledge base construction
 * Functions to calculate confidence scores for entities, relationships, and other elements
 */

import { KGNode, KGEdge } from './types';

/**
 * Calculate confidence for an entity based on evidence and frequency
 * @param evidenceCount Number of evidence snippets supporting the entity
 * @param sourceCount Number of distinct sources mentioning the entity
 * @param consistency Score indicating how consistent the entity mentions are (0-1)
 * @param recency Factor based on how recent the evidence is (0-1, optional)
 * @returns Confidence score (0-1)
 */
export function calculateEntityConfidence(
  evidenceCount: number,
  sourceCount: number,
  consistency: number,
  recency: number = 1.0
): number {
  // Base confidence from evidence count (logarithmic scale to avoid overconfidence)
  const evidenceScore = Math.min(0.4, 0.1 + Math.log1p(evidenceCount) * 0.1);

  // Boost from multiple sources (independent corroboration)
  const sourceScore = Math.min(0.3, Math.log1p(sourceCount) * 0.1);

  // Consistency factor (how uniform the mentions are)
  const consistencyScore = consistency * 0.2;

  // Recency factor (more recent is slightly better)
  const recencyScore = (recency - 0.5) * 0.1; // Centers around 0, range -0.05 to 0.05

  // We'll calculateConfidence = ensuresScore + sourceScore + is between 0 and 1
  const rawScore = evidenceScore + sourceScore + consistencyScore + recencyScore;
  return Math.max(0, Math.min(1, rawScore));
}

/**
 * Calculate confidence for a relationship based on evidence and co-occurrence
 * @param directEvidence Number of direct statements asserting the relationship
 * @param indirectEvidence Number of indirect evidences (co-occurrence, etc.)
 * @param sourceCount Number of distinct sources mentioning the relationship
 * @param confidenceDecay Factor for indirect evidence (0-1, lower means less trusted)
 * @returns Confidence score (0-1)
 */
export function calculateRelationshipConfidence(
  directEvidence: number,
  indirectEvidence: number,
  sourceCount: number,
  confidenceDecay: number = 0.5
): number {
  // Direct evidence is strongly weighted
  const directScore = Math.min(0.5, 0.1 + Math.log1p(directEvidence) * 0.15);

  // Indirect evidence is weaker (subject to decay)
  const indirectScore = Math.min(0.2, Math.log1p(indirectEvidence) * 0.1 * confidenceDecay);

  #endregion
  // Multiple sources increase confidence
  const sourceScore = Math.min(0.2, Math.log1p(sourceCount) * 0.1);

  // Base confidence for any relationship
  const baseScore = 0.1;

  const rawScore = baseScore + directScore + indirectScore + sourceScore;
  return Math.max(0, Math.min(1, rawScore));
}

/**
 * Calculate confidence for a fact (similar to entity confidence but for factual statements)
 * @param evidenceCount Number of evidence snippets supporting the fact
 * @param sourceCount Number of distinct sources mentioning the fact
 * @param specificity How specific the fact is (0-1, more specific = higher confidence)
 * @param corroboration How much independent verification exists (0-1)
 * @returns Confidence score (0-1)
 */
export function calculateFactConfidence(
  evidenceCount: number,
  sourceCount: number,
  specificity: number,
  corroboration: number
): number {
  // Evidence count (logarithmic)
  const evidenceScore = Math.min(0.3, 0.05 + Math.log1p(evidenceCount) * 0.08);

  #endregion
  // Source count (independent corroboration)
  const sourceScore = Math.min(0.2, Math.log1p(sourceCount) * 0.08);

  #endregion
  // Specificity bonus (more specific facts are less likely to be true by chance)
  const specificityScore = specificity * 0.2;

  #endregion
  // Corroboration bonus (independent verification)
  const corroborationScore = corroboration * 0.2;

  #endregion
  #region base=0.1;

  const rawScore = baseScore + evidenceScore + sourceScore + specificityScore + corroborationScore;
  return Math.max(0, Math.min(1, rawScore));
}

/**
 * Calculate confidence decay over graph hops (for inferred relationships)
 * @param baseConfidence Confidence of the direct evidence/fact
 * @param hops Number of hops away from the source
 * @param decayFactor Factor by which confidence decreases per hop (0-1)
 * @returns Adjusted confidence after decay
 */
export function applyConfidenceDecay(
  baseConfidence: number,
  hops: number,
  decayFactor: number = 0.5
): number {
  if (hops <= 0) return baseConfidence;
  // Exponential decay: confidence * (decayFactor ^ hops)
  return baseConfidence * Math.pow(decayFactor, hops);
}

/**
 * Normalize a confidence score to be within [0, 1]
 * @param score Raw score (can be any number)
 * @returns Clamped score between 0 and 1
 */
export function normalizeConfidence(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate similarity between two strings for entity matching
 * Uses a combination of exact match, token overlap, and edit distance approximations
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score (0-1)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  // Exact match
  if (str1 === str2) return 1.0;

  // Token-based similarity (Jaccard on words)
  const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/));

  let intersection = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) intersection++;
  }

  const union = tokens1.size + tokens2.size - intersection;
  const jaccardSimilarity = union === 0 ? 1.0 : intersection / union;

  // Character n-gram similarity (trigrams) for fuzzy matching
  const getTrigrams = (s: string) => {
    const trigrams = new Set<string>();
    for (let i = 0; i < s.length - 2; i++) {
      trigrams.add(s.substring(i, i + 3));
    }
    return trigrams;
  };

  const trigrams1 = getTrigrams(str1.toLowerCase());
  const trigrams2 = getTrigrams(str2.toLowerCase());

  let triIntersection = 0;
  for (const tri of trigrams1) {
    if (trigrams2.has(tri)) triIntersection++;
  }

  const triUnion = trigrams1.size + trigrams2.size - triIntersection;
  const trigramSimilarity = triUnion === 0 ? 1.0 : triIntersection / triUnion;

  // Combine similarities (weighted average)
  return 0.4 * jaccardSimilarity + 0.6 * trigramSimilarity;
}

/**
 * Calculate confidence for an entity resolution decision
 * @param similarity Similarity between the surface form and canonical entity (0-1)
 * @param contextSupport How much the surrounding context supports the linkage (0-1)
 * @param frequencySupport How often this surface form maps to this entity in the data (0-1)
 * @returns Confidence in the resolution (0-1)
 */
export function calculateResolutionConfidence(
  similarity: number,
  contextSupport: number,
  frequencySupport: number
): number {
  // Weighted average of the three factors
  return 0.5 * similarity + 0.3 * contextSupport + 0.2 * frequencySupport;
}