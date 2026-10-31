import { requestPath } from '../normalize/request-path.js';

export function pathsFromUrlList(text: string, label = 'URL list'): string[] {
  const paths: string[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trim();
    if (!line || line.startsWith('#')) continue;
    try {
      paths.push(requestPath(line));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${label}:${index + 1}: ${reason}`, { cause: error });
    }
  }
  return paths;
}
