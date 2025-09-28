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


