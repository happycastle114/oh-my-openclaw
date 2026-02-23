import { promises as fs } from 'fs';
import { dirname } from 'path';

export type StateResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'not_found' | 'corrupted' | 'io_error'; message: string };

export async function readState<T>(filePath: string): Promise<StateResult<T>> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    try {
      return { ok: true, data: JSON.parse(data) as T };
    } catch {
      return { ok: false, error: 'corrupted', message: `Malformed JSON in ${filePath}` };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ok: false, error: 'not_found', message: `File not found: ${filePath}` };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: 'io_error', message: msg };
  }
}

export async function writeState<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(dirname(filePath));
  const jsonContent = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, jsonContent, 'utf-8');
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}
