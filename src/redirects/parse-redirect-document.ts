import { parseNetlifyTomlRedirects } from './parse-netlify-toml.js';
import { parseRedirectsFile } from './parse-redirects-file.js';
import type { RedirectRule } from './redirect-rule.js';

export function parseRedirectDocument(text: string, filename: string): RedirectRule[] {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  if (base === 'netlify.toml' || /^\s*\[\[\s*redirects\s*\]\]/im.test(text)) {
    return parseNetlifyTomlRedirects(text);
  }
  return parseRedirectsFile(text);
}
