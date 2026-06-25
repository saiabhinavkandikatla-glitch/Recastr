// lib/knowledgeBase/shared/rules.ts

/**
 * Validation rules for knowledge base construction
 * Rules that must be satisfied for nodes and edges to be considered valid
 */

import { KGNode, KGEdge } from './types';

/**
 * Rule: Node must have a non-empty ID and type
 */
export const NodeIdTypeRule = {
  id: 'node-id-type',
  description: 'Node must have a non-empty string ID and a valid type',
  validate: (node: KGNode) => {
    if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
      return {
        passed: false,
        score: 0.0,
        reason: 'Node ID must be a non-empty string'
      };
    }

    const validTypes = ['entity', 'fact', 'concept'];
    if (!node.type || typeof node.type !== 'string' || !validTypes.includes(node.type)) {
      return {
        passed: false,
        score: 0.0,
        reason: `Node type must be one of: ${validTypes.join(', ')}`
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Node ID and type are valid'
    };
  }
};

/**
 * Rule: Node must have a label
 */
export const NodeLabelRule = {
  id: 'node-label',
  description: 'Node must have a non-empty label',
  validate: (node: KGNode) => {
    if (!node.label || typeof node.label !== 'string' || node.label.trim() === '') {
      return {
        passed: false,
        score: 0.0,
        reason: 'Node label must be a non-empty string'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Node label is valid'
    };
  }
};

/**
 * Rule: Edge must have valid source and target node IDs
 */
export const EdgeEndpointsRule = {
  id: 'edge-endpoints',
  description: 'Edge must have valid source and target node IDs (strings)',
  validate: (edge: KGEdge, nodeIds: Set<string>) => {
    if (!edge.source || typeof edge.source !== 'string' || edge.source.trim() === '') {
      return {
        passed: false,
        score: 0.0,
        reason: 'Edge source must be a non-empty string'
      };
    }

    if (!nodeIds.has(edge.source)) {
      return {
        passed: false,
        score: 0.0,
        reason: `Edge source node ID "${edge.source}" does not exist in the graph`
      };
    }

    if (!edge.target || typeof edge.target !== 'string' || edge.target.trim() === '') {
      return {
        passed: false,
        score: 0.0,
        reason: 'Edge target must be a non-empty string'
      };
    }

    if (!nodeIds.has(edge.target)) {
      return {
        passed: false,
        score: 0.0,
        reason: `Edge target node ID "${edge.target}" does not exist in the graph`
      };
    }

    // Prevent self-loops unless explicitly allowed (we'll allow them but note in reason)
    if (edge.source === edge.target) {
      return {
        passed: true, // We'll allow self-loops but with a note
        score: 0.8,   // Slightly reduced confidence for self-loops
        reason: 'Edge is a self-loop (source and target are the same node)'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Edge endpoints are valid'
    };
  }
};

/**
 * Rule: Edge must have a non-empty type
 */
export const EdgeTypeRule = {
  id: 'edge-type',
  description: 'Edge must have a non-empty string type',
  validate: (edge: KGEdge) => {
    if (!edge.type || typeof edge.type !== 'string' || edge.type.trim() === '') {
      return {
        passed: false,
        score: 0.0,
        reason: 'Edge type must be a non-empty string'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Edge type is valid'
    };
  }
};

/**
 * Rule: Node confidence must be between 0 and 1
 */
export const NodeConfidenceRule = {
  id: 'node-confidence',
  description: 'Node confidence must be a number between 0 and 1',
  validate: (node: KGNode) => {
    const confidence = node.properties.confidence;
    if (typeof confidence !== 'number' || isNaN(confidence) || confidence < 0 || confidence > 1) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Node confidence must be a number between 0 and 1'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Node confidence is valid'
    };
  }
};

/**
 * Rule: Edge confidence must be between 0 and 1
 */
export const EdgeConfidenceRule = {
  id: 'edge-confidence',
  description: 'Edge confidence must be a number between 0 and 1',
  validate: (edge: KGEdge) => {
    const confidence = edge.properties.confidence;
    if (typeof confidence !== 'number' || isNaN(confidence) || confidence < 0 || confidence > 1) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Edge confidence must be a number between 0 and 1'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Edge confidence is valid'
    };
  }
};

/**
 * Rule: Node timestamps must be valid ISO strings
 */
export const NodeTimestampRule = {
  id: 'node-timestamp',
  description: 'Node createdAt and updatedAt must be valid ISO date strings',
  validate: (node: KGNode) => {
    const createdAt = new Date(node.createdAt);
    const updatedAt = new Date(node.updatedAt);

    if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Node timestamps must be valid ISO date strings'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Node timestamps are valid'
    };
  }
};

/**
 * Rule: Edge timestamps must be valid ISO strings
 */
export const EdgeTimestampRule = {
  id: 'edge-timestamp',
  description: 'Edge createdAt and updatedAt must be valid ISO date strings',
  validate: (edge: KGEdge) => {
    const createdAt = new Date(edge.createdAt);
    const updatedAt = new Date(edge.updatedAt);

    if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Edge timestamps must be valid ISO date strings'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Edge timestamps are valid'
    };
  }
};

/**
 * Rule: Node properties must be an object
 */
export const NodePropertiesRule = {
  id: 'node-properties',
  description: 'Node properties must be an object',
  validate: (node: KGNode) => {
    if (node.properties === null || typeof node.properties !== 'object' || Array.isArray(node.properties)) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Node properties must be an object'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Node properties are valid'
    };
  }
};

/**
 * Rule: Edge properties must be an object
 */
export const EdgePropertiesRule = {
  id: 'edge-properties',
  description: 'Edge properties must be an object',
  validate: (edge: KGEdge) => {
    if (edge.properties === null || typeof edge.properties !== 'object' || Array.isArray(edge.properties)) {
      return {
        passed: false,
        score: 0.0,
        reason: 'Edge properties must be an object'
      };
    }

    return {
      passed: true,
      score: 1.0,
      reason: 'Edge properties are valid'
    };
  }
};

/**
 * Apply all validation rules to a node
 * @param node Node to validate
 * @param nodeIds Set of all node IDs in the graph (for edge validation, but not used here)
 * @returns Validation result
 */
export function validateNode(node: KGNode, nodeIds: Set<string> = new Set()): {
  passed: boolean;
  score: number;
  reasons: string[];
  failedRules: string[];
} {
  const rules = [
    NodeIdTypeRule,
    NodeLabelRule,
    NodeConfidenceRule,
    NodeTimestampRule,
    NodePropertiesRule
  ];

  return applyRules(node, rules, nodeIds);
}

/**
 * Apply all validation rules to an edge
 * @param edge Edge to validate
 * @param nodeIds Set of all node IDs in the graph (to check existence of source/target)
 * @returns Validation result
 */
export function validateEdge(edge: KGEdge, nodeIds: Set<string>): {
  passed: boolean;
  score: number;
  reasons: string[];
  failedRules: string[];
} {
  const rules = [
    EdgeEndpointsRule,
    EdgeTypeRule,
    EdgeConfidenceRule,
    EdgeTimestampRule,
    EdgePropertiesRule
  ];

  // Note: EdgeEndpointsRule needs the nodeIds set
  // We'll need to pass it to the validate function of that rule
  // Let's adjust our approach: we'll call each rule's validate function with the necessary args

  let totalScore = 0.0;
  let passedCount = 0;
  const reasons: string[] = [];
  const failedRules: string[] = [];

  for (const rule of rules) {
    let result;
    if (rule.id === 'edge-endpoints') {
      // This rule needs the nodeIds
      // @ts-ignore - we know the validate signature for this rule
      result = rule.validate(edge, nodeIds);
    } else {
      // @ts-ignore - we assume the validate signature is (edge)
      result = rule.validate(edge);
    }

    totalScore += result.score;
    if (result.passed) {
      passedCount++;
    } else {
      failedRules.push(rule.id);
    }
    reasons.push(`[${rule.id}] ${result.reason}`);
  }

  const averageScore = rules.length > 0 ? totalScore / rules.length : 0.0;
  const passed = passedCount === rules.length; // All rules must pass

  return {
    passed,
    score: averageScore,
    reasons,
    failedRules
  };
}

/**
 * Helper function to apply a list of rules to an item
 * @param item The item to validate (node or edge)
 * @param rules Array of rule objects
 * @param nodeIds Set of node IDs (only needed for certain edge rules)
 * @returns Validation result
 */
function applyRules<T>(
  item: T,
  rules: Array<{ id: string; description: string; validate: (item: T, nodeIds?: Set<string>) => { passed: boolean; score: number; reason: string } }>,
  nodeIds: Set<string> = new Set()
): {
  passed: boolean;
  score: number;
  reasons: string[];
  failedRules: string[];
} {
  let totalScore = 0.0;
  let passedCount = 0;
  const reasons: string[] = [];
  const failedRules: string[] = [];

  for (const rule of rules) {
    // @ts-ignore - we're assuming the validate function matches the signature
    const result = rule.validate(item, nodeIds);
    totalScore += result.score;
    if (result.passed) {
      passedCount++;
    } else {
      failedRules.push(rule.id);
    }
    reasons.push(`[${rule.id}] ${result.reason}`);
  }

  const averageScore = rules.length > 0 ? totalScore / rules.length : 0.0;
  const passed = passedCount === rules.length; // All rules must pass

  return {
    passed,
    score: averageScore,
    reasons,
    failedRules
  };
}