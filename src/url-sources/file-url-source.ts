import { pathsFromUrlList } from './paths-from-url-list.js';
import { readTextFile } from './read-text-file.js';
import type { UrlSource } from './url-source.js';

export class FileUrlSource implements UrlSource {
  constructor(private readonly filePaths: readonly string[]) {}

  async collect(): Promise<readonly string[]> {
    const paths: string[] = [];
    for (const filePath of this.filePaths) {
      const text = await readTextFile(filePath, 'Could not read URL list');
      paths.push(...pathsFromUrlList(text, filePath));
    }
    return paths;
  }
}
