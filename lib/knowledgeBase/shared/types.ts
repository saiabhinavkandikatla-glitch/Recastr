// lib/knowledgeBase/shared/types.ts

/**
 * TypeScript interfaces for the Knowledge Base Builder
 */

/**
 * Base node in the knowledge graph
 */
export interface KGNode {
  id: string; // Unique identifier for the node
  type: 'entity' | 'fact' | 'concept'; // Type of node
  label: string; // Human-readable label for the node
  // For entity nodes, we might have additional specific fields, but we'll keep it generic
  // and put specifics in properties
  properties: {
    canonical_name?: string; // Canonical name (for entities)
    aliases?: string[]; // Alternative names
    confidence?: number; // Confidence score (0-1)
    // Other properties can be added here
    [key: string]: any;
  };
  // Timestamps
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Edge in the knowledge graph
 */
export interface KGEdge {
  id: string; // Unique identifier for the edge
  source: string; // Source node ID
  target: string; // Target node ID
  type: string; // Relationship type (e.g., 'founded_by', 'located_in')
  label?: string; // Human-readable label for the edge
  properties: {
    confidence?: number; // Confidence score (0-1)
    supporting_fact_ids?: string[]; // IDs of facts that support this edge
    supporting_chunk_ids?: string[]; // IDs of chunks that provide evidence
    supporting_evidence?: string[]; // Actual evidence text snippets
    // Other properties can be added here
    [key: string]: any;
  };
  // Timestamps
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Configuration for the knowledge base builder
 */
export interface KBBuilderConfig {
  // Entity resolution settings
  entitySimilarityThreshold: number; // Threshold for considering two entities as the same (0-1)
  enableEntityResolution: boolean; // Whether to perform entity resolution
  // Relationship building settings
  relationshipConfidenceThreshold: number; // Minimum confidence for a relationship to be included (0-1)
  enableRelationshipBuilding: boolean; // Whether to build relationships
  // General settings
  confidenceDecayFactor: number; // Factor for confidence decay over hops (0-1)
  maxHops: number; // Maximum number of hops to consider for indirect relationships
  // Versioning
  builderVersion: string;
  resolverVersion: string;
  relationshipEngineVersion: string;
  normalizerVersion: string;
}

/**
 * Result of merging two nodes or edges
 */
export interface KGMergeResult {
  survived: boolean; // Whether the item survived the merge (true) or was absorbed (false)
  mergedInto: string; // ID of the item that was merged into (if survived is false) or self (if true)
  changes: {
    // Fields that were changed during the merge
    [key: string]: { old: any; new: any };
  };
  reason: string; // Reason for the merge decision
}

/**
 * Statistics about the knowledge graph
 */
export interface KGStatistics {
  nodeCount: number;
  edgeCount: number;
  entityCount: number;
  factCount: number;
  conceptCount: number;
  averageNodeDegree: number;
  connectedComponents: number;
  // Confidence statistics
  avgNodeConfidence: number;
  avgEdgeConfidence: number;
  // Coverage
  nodesWithAliases: number;
  nodesWithSources: number;
}

/**
 * Input for the knowledge base builder (validated facts from evidence validation)
 */
export interface KBBuilderInput {
  // Validated facts from evidence validation
  facts: {
    id: string;
    chunkId: string;
    evidenceText: string;
    factType: 'fact' | 'quote' | 'statistic' | 'story' | 'example' | 'lesson' | 'insight' | 'entity' | 'date';
    confidence: number;
    // Other fields from ValidationResult that are relevant
    supported: boolean;
    validationScore: number;
    // We'll assume we have the necessary data to build the KB
    // In practice, we might need to map these to our internal node/edge structures
  }[];
  // We might also want to pass in the original chunks for context
  chunks: {
    id: string;
    text: string;
  }[];
}