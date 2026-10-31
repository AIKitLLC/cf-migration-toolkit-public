import { emptyMigrationProject } from './migration-document.js';
import type { MatchCondition, MigrationProject, MigrationRedirect } from './migration-document.js';

export function parseVercelConfig(text: string, file: string): MigrationProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${file} as JSON: ${message}`, { cause: error });
  }
  if (!isRecord(parsed)) throw new Error(`${file} must be a JSON object`);
  const project = emptyMigrationProject();
  for (const entry of arrayOf(parsed.redirects)) {
    const redirect = vercelRoute(entry, file, text, 'redirect');
    if (redirect) project.redirects.push(redirect);
  }
  for (const entry of arrayOf(parsed.rewrites)) {
    const rewrite = vercelRoute(entry, file, text, 'rewrite');
    if (rewrite) project.redirects.push(rewrite);
  }
  for (const entry of arrayOf(parsed.headers)) {
    const header = vercelHeader(entry, file, text);
    if (header) project.headers.push(header);
  }
  if (typeof parsed.trailingSlash === 'boolean') {
    project.behaviors.push({
      location: { file, line: lineOf(text, '"trailingSlash"') },
      name: 'trailing-slash',
      value: parsed.trailingSlash,
    });
  }
  if (parsed.cleanUrls === true) {
    project.behaviors.push({
      location: { file, line: lineOf(text, '"cleanUrls"') },
      name: 'clean-urls',
      value: true,
    });
  }
  if (parsed.routes !== undefined) {
    project.notes.push({
      location: { file, line: lineOf(text, '"routes"') },
      detail: 'vercel.json routes',
    });
  }
  return project;
}

function vercelRoute(entry: unknown, file: string, text: string, kind: 'redirect' | 'rewrite'): MigrationRedirect | null {
  if (!isRecord(entry)) return null;
  const from = stringField(entry.source);
  const to = stringField(entry.destination);
  if (!from || !to) return null;
  const explicitStatus = typeof entry.statusCode === 'number';
  const permanent = typeof entry.permanent === 'boolean' ? entry.permanent : null;
  return {
    location: { file, line: lineOf(text, from) },
    platform: 'vercel',
    kind,
    from,
    to,
    status: kind === 'rewrite' ? 200 : explicitStatus ? numberField(entry.statusCode) : null,
    explicitStatus: kind === 'rewrite' || explicitStatus,
    permanent: kind === 'rewrite' ? null : permanent,
    force: false,
    conditions: routeConditions(entry),
    signed: false,
    proxyRequestHeaders: false,
  };
}

function vercelHeader(entry: unknown, file: string, text: string): MigrationProject['headers'][number] | null {
  if (!isRecord(entry)) return null;
  const path = stringField(entry.source);
  if (!path) return null;
  const headers = arrayOf(entry.headers).flatMap((field) => {
    if (!isRecord(field)) return [];
    const name = stringField(field.key);
    const value = stringField(field.value);
    if (!name || value === null) return [];
    return [{ name, value }];
  });
  if (headers.length === 0) return null;
  return {
    location: { file, line: lineOf(text, path) },
    platform: 'vercel',
    path,
    headers,
    conditions: routeConditions(entry),
  };
}

function routeConditions(entry: Record<string, unknown>): MatchCondition[] {
  return [
    ...arrayOf(entry.has).map((item) => matchCondition(item, 'has')),
    ...arrayOf(entry.missing).map((item) => matchCondition(item, 'missing')),
  ];
}

function matchCondition(entry: unknown, kind: 'has' | 'missing'): MatchCondition {
  if (!isRecord(entry)) return { kind, detail: kind };
  const type = stringField(entry.type) ?? 'unknown';
  const key = stringField(entry.key) ?? '';
  return { kind, detail: key ? `${type}:${key}` : type };
}

function lineOf(text: string, needle: string): number {
  const index = text.indexOf(needle);
  if (index === -1) return 1;
  return text.slice(0, index).split(/\r?\n/).length;
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberField(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
