import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export async function writeAtomic(filePath: string, contents: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const temporary = join(dirname(filePath), `.${basename(filePath)}.${process.pid}.tmp`);
  try {
    await writeFile(temporary, contents, 'utf8');
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
