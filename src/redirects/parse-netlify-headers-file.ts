import { emptyMigrationProject } from './migration-document.js';
import type { HeaderField, MigrationProject } from './migration-document.js';

export function parseNetlifyHeadersFile(text: string, file: string): MigrationProject {
  const project = emptyMigrationProject();
  const lines = text.split(/\r?\n/);
  let path = '';
  let pathLine = 1;
  let headers: HeaderField[] = [];

  const flush = (): void => {
    if (!path || headers.length === 0) return;
    project.headers.push({
      location: { file, line: pathLine },
      platform: 'netlify',
      path,
      headers,
      conditions: [],
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? '';
    if (!raw.trim() || isComment(raw)) continue;
    if (isIndented(raw)) {
      const field = headerField(raw.trim());
      if (field) headers.push(field);
      continue;
    }
    flush();
    path = raw.trim();
    pathLine = index + 1;
    headers = [];
  }
  flush();
  return project;
}

function isComment(line: string): boolean {
  return line.trimStart().startsWith('#');
}

function isIndented(line: string): boolean {
  return line.startsWith(' ') || line.startsWith('\t');
}

function headerField(text: string): HeaderField | null {
  if (text.startsWith('!') && !text.includes(':')) return { name: text, value: '' };
  const separator = text.indexOf(':');
  if (separator === -1) return null;
  const name = text.slice(0, separator).trim();
  const value = text.slice(separator + 1).trim();
  if (!name) return null;
  return { name, value };
}
