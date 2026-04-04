import { Readable } from 'stream';

export type SaveDocumentParams = {
  employeeId: number;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export type SaveDocumentResult = {
  storedName: string;
  storagePath: string;
  size: number;
};

export interface StorageProvider {
  save(params: SaveDocumentParams): Promise<SaveDocumentResult>;
  getStream(storagePath: string): Promise<Readable>;
  delete(storagePath: string): Promise<void>;
  exists(storagePath: string): Promise<boolean>;
}
