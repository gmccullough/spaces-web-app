export type FileEntry = {
  path: string;
  name: string;
  size: number;
  contentType?: string;
  updatedAt?: string;
  isDirectory?: boolean;
};

export type ListFilesResponse = { files: FileEntry[] };

export type WriteFileResponse = {
  path: string;
  size: number;
  contentType: string;
  etag?: string;
};

export type ErrorEnvelope = { error: { code: string; message: string } };

export type PutOptions = { ifNoneMatch?: '*' };




// ----------------------- Mind Map (Realtime OOB) -------------------------

export const SPACES_MINDMAP_CHANNEL = "spaces-mindmap" as const;
export const MINDMAP_DIFF_SCHEMA_NAME = "mindmap_diff_v1" as const;
export const MINDMAP_DEBOUNCE_MS = 800;
export const MINDMAP_INFLIGHT_TIMEOUT_MS = 6000;
export const MINDMAP_MAX_CONTEXT_TURNS = 8;
export const MINDMAP_SNAPSHOT_SCHEMA_VERSION = "1" as const;

export type MindMapOp =
  | {
      type: 'add_node';
      label: string;
      summary?: string;
      keywords?: string[];
      salience?: number; // 1-10
    }
  | {
      type: 'update_node';
      label: string;
      summary?: string;
      keywords?: string[];
      salience?: number; // 1-10
    }
  | {
      type: 'add_edge';
      sourceLabel: string;
      targetLabel: string;
      relation?: string;
      confidence?: number; // 0-1
    }
  | {
      type: 'remove_edge';
      sourceLabel: string;
      targetLabel: string;
      relation?: string;
    };

export type MindMapDiff = {
  ops: MindMapOp[];
};

// JSON Schema for response_format: json_schema → use inside response.create
export const mindMapDiffJsonSchema: Record<string, any> = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: MINDMAP_DIFF_SCHEMA_NAME,
  type: 'object',
  additionalProperties: false,
  required: ['ops'],
  properties: {
    ops: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        oneOf: [
          {
            type: 'object',
            required: ['type', 'label'],
            properties: {
              type: { const: 'add_node' },
              label: { type: 'string', minLength: 1 },
              summary: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              salience: { type: 'number', minimum: 1, maximum: 10 },
            },
          },
          {
            type: 'object',
            required: ['type', 'label'],
            properties: {
              type: { const: 'update_node' },
              label: { type: 'string', minLength: 1 },
              summary: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              salience: { type: 'number', minimum: 1, maximum: 10 },
            },
          },
          {
            type: 'object',
            required: ['type', 'sourceLabel', 'targetLabel'],
            properties: {
              type: { const: 'add_edge' },
              sourceLabel: { type: 'string', minLength: 1 },
              targetLabel: { type: 'string', minLength: 1 },
              relation: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
          {
            type: 'object',
            required: ['type', 'sourceLabel', 'targetLabel'],
            properties: {
              type: { const: 'remove_edge' },
              sourceLabel: { type: 'string', minLength: 1 },
              targetLabel: { type: 'string', minLength: 1 },
              relation: { type: 'string' },
            },
          },
        ],
      },
    },
  },
};

// Helper to build a response.create event with proper OOB configuration
export function buildMindMapOOBRequest(params: { spaceName?: string; instructions: string }) {
  const { spaceName, instructions } = params;
  return {
    type: 'response.create',
    response: {
      conversation: 'none',
      tool_choice: 'none',
      modalities: ['text'],
      instructions,
      metadata: { channel: SPACES_MINDMAP_CHANNEL, spaceName },
    },
  } as const;
}

// ----------------------- Mind Map Snapshot Types -------------------------

export type MindMapSnapshotNode = {
  id: string;
  label: string;
  summary?: string;
  keywords?: string[];
  salience?: number;
};

export type MindMapSnapshotEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relation?: string;
  confidence?: number;
};

export type MindMapSnapshot = {
  schema_version: typeof MINDMAP_SNAPSHOT_SCHEMA_VERSION;
  space_name: string;
  updated_at: string; // ISO
  nodes: MindMapSnapshotNode[];
  edges: MindMapSnapshotEdge[];
};

export function buildMindMapSnapshot(spaceName: string, state: { nodesByLabel: Record<string, { label: string; summary?: string; keywords?: string[]; salience?: number }>; edges: Array<{ sourceLabel: string; targetLabel: string; relation?: string; confidence?: number }> }): MindMapSnapshot {
  const nodes: MindMapSnapshotNode[] = Object.values(state.nodesByLabel).map((n) => ({
    id: `n_${encodeURIComponent(n.label)}`,
    label: n.label,
    summary: n.summary,
    keywords: n.keywords,
    salience: n.salience,
  }));
  const edges: MindMapSnapshotEdge[] = state.edges.map((e, idx) => ({
    id: `e_${encodeURIComponent(e.sourceLabel)}_${encodeURIComponent(e.targetLabel)}_${encodeURIComponent(e.relation || '')}_${idx}`,
    sourceId: `n_${encodeURIComponent(e.sourceLabel)}`,
    targetId: `n_${encodeURIComponent(e.targetLabel)}`,
    relation: e.relation,
    confidence: e.confidence,
  }));
  return {
    schema_version: MINDMAP_SNAPSHOT_SCHEMA_VERSION,
    space_name: spaceName,
    updated_at: new Date().toISOString(),
    nodes,
    edges,
  };
}
