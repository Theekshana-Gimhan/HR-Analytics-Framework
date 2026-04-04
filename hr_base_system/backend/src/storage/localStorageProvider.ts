import { promises as fs, createReadStream } from 'fs';
import { Readable } from 'stream';
import path from 'path';
import { randomUUID } from 'crypto';
import { StorageProvider, SaveDocumentParams, SaveDocumentResult } from './StorageProvider';
import config from '../config';

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(rootPath: string = config.LOCAL_STORAGE_ROOT) {
    this.root = rootPath;
  }

  private async ensureEmployeeDirectory(employeeId: number) {
    const employeeDir = path.join(this.root, String(employeeId));
    await fs.mkdir(employeeDir, { recursive: true });
    return employeeDir;
  }

  async save(params: SaveDocumentParams): Promise<SaveDocumentResult> {
    const { employeeId, buffer, originalName } = params;
    const employeeDir = await this.ensureEmployeeDirectory(employeeId);

    const extension = path.extname(originalName) || '';
    const storedName = `${randomUUID()}${extension}`;
    const absolutePath = path.join(employeeDir, storedName);

    await fs.writeFile(absolutePath, buffer);

    const relativePath = path.relative(this.root, absolutePath);

    return {
      storedName,
      storagePath: relativePath,
      size: buffer.length,
    };
  }

  async getStream(storagePath: string): Promise<Readable> {
    const absolutePath = path.join(this.root, storagePath);
    return createReadStream(absolutePath);
  }

  async delete(storagePath: string): Promise<void> {
    const absolutePath = path.join(this.root, storagePath);
    await fs.unlink(absolutePath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    });
  }

  async exists(storagePath: string): Promise<boolean> {
    const absolutePath = path.join(this.root, storagePath);
    try {
      await fs.access(absolutePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}
