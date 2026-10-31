import { expandRuleSource } from '../redirects/expand-rule-source.js';
import { parseRedirectDocument } from '../redirects/parse-redirect-document.js';
import { readTextFile } from './read-text-file.js';
import type { UrlSource } from './url-source.js';

export class RedirectsUrlSource implements UrlSource {
  constructor(private readonly filePaths: readonly string[]) {}

  async collect(): Promise<readonly string[]> {
    const paths: string[] = [];
    for (const filePath of this.filePaths) {
      const text = await readTextFile(filePath, 'Could not read redirects');
      const rules = parseRedirectDocument(text, filePath);
      for (const rule of rules) {
        paths.push(expandRuleSource(rule));
      }
    }
    return paths;
  }
}
