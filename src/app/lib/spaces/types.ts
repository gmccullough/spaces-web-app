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
  title: 'mindmap_diff_v1',
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
