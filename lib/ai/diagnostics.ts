export interface TranscriptInfo {
  length: number;
  wordCount: number;
  isPlaceholder: boolean;
}
export interface ChunkInfo {
  count: number;
  sizes: number[];
  averageSize: number;
}
export interface Fact {
  id: string;
  text: string;
  type: 'lesson' | 'actionable_advice' | 'surprising_fact' | 'quote' | 'topic' | 'other';
  confidence: number; // 0-1
  sourceChunkIndices: number[]; // indices of chunks that contributed to this fact
  evidence?: string;
}
export interface KnowledgeGraphInfo {
  tldr: string;
  takeaways: string[];
  topics: string[]; // entities
}
export interface GenerationContext {
  factsSupplied: number;
  contextSize: number; // token estimate
  promptSize: number; // content + template
}
export interface GenerationOutput {
  hooks: Array<{id: string; text: string; hookType: string; reachScore: number}>;
  contents: Array<{
    id: string;
    platform: string;
    contentType: string;
    body: string;
    tone: string;
    approved: boolean;
    order: number;
  }>;
}
export interface SentenceEvaluation {
  sentence: string;
  supportedFactId?: string;
  supportingChunks: number[];
  evidenceText: string;
  confidence: number; // 0-1
  status: 'SUPPORTED' | 'WEAKLY_SUPPORTED' | 'UNSUPPORTED';
}
export interface TraceabilityReport {
  postId: string;
  platform: string;
  sentences: SentenceEvaluation[];
  summary: {
    total: number;
    supported: number;
    weaklySupported: number;
    unsupported: number;
    groundingScore: number; // percentage
    hallucinationRate: number; // percentage
  };
}
export interface PipelineDiagnostics {
  transcript: TranscriptInfo;
  chunking: ChunkInfo;
  factExtraction: {
    preValidation: number; // raw facts extracted
    postValidation: Fact[];
  };
  knowledgeGraph: KnowledgeGraphInfo;
  generationContext: GenerationContext;
  output: GenerationOutput;
  traceability: TraceabilityReport[];
}
// Helper class to build diagnostics incrementally
export class PipelineDiagnosticsBuilder {
  private diagnostics: PipelineDiagnostics;

  constructor() {
    this.diagnostics = {
      transcript: { length: 0, wordCount: 0, isPlaceholder: false },
      chunking: { count: 0, sizes: [], averageSize: 0 },
      factExtraction: { preValidation: 0, postValidation: [] },
      knowledgeGraph: { tldr: '', takeaways: [], topics: [] },
      generationContext: { factsSupplied: 0, contextSize: 0, promptSize: 0 },
      output: { hooks: [], contents: [] },
      traceability: []
    };
  }

  setTranscript(info: TranscriptInfo) {
    this.diagnostics.transcript = info;
    return this;
  }

  setChunking(info: ChunkInfo) {
    this.diagnostics.chunking = info;
    return this;
  }

  setPreValidationFactCount(count: number) {
    this.diagnostics.factExtraction.preValidation = count;
    return this;
  }

  setPostValidationFacts(facts: Fact[]) {
    this.diagnostics.factExtraction.postValidation = facts;
    return this;
  }

  setKnowledgeGraph(info: KnowledgeGraphInfo) {
    this.diagnostics.knowledgeGraph = info;
    return this;
  }

  setGenerationContext(info: GenerationContext) {
    this.diagnostics.generationContext = info;
    return this;
  }

  setOutput(output: GenerationOutput) {
    this.diagnostics.output = output;
    return this;
  }

  addTraceabilityReport(report: TraceabilityReport) {
    this.diagnostics.traceability.push(report);
    return this;
  }

  build(): PipelineDiagnostics {
    return this.diagnostics;
  }
}
