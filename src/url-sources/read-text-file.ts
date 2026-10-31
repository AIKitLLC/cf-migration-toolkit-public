import { readFile } from 'node:fs/promises';

export async function readTextFile(filePath: string, action: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : 'unknown';
    throw new Error(`${action} ${filePath} (${code})`, { cause: error });
  }
}
