import { migrationFromRedirectsFile } from './migration-from-redirects-file.js';
import type { MigrationProject } from './migration-document.js';
import { parseNetlifyConfig } from './parse-netlify-config.js';
import { parseNetlifyHeadersFile } from './parse-netlify-headers-file.js';
import { parseVercelConfig } from './parse-vercel-config.js';

const ACCEPTED = 'netlify.toml, _redirects, _headers, or vercel.json';

export function migrationFromNamedFile(text: string, file: string): MigrationProject {
  const base = file.split(/[/\\]/).pop() ?? file;
  if (base === 'netlify.toml') return parseNetlifyConfig(text, file);
  if (base === '_redirects') return migrationFromRedirectsFile(text, file);
  if (base === '_headers') return parseNetlifyHeadersFile(text, file);
  if (base === 'vercel.json') return parseVercelConfig(text, file);
  throw new Error(`Cannot convert ${file}. Expected ${ACCEPTED}.`);
}

export const CONVERT_INPUT_NAMES = ['netlify.toml', '_redirects', '_headers', 'vercel.json'] as const;
