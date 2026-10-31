import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function isDirectRun(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return metaUrl === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}
